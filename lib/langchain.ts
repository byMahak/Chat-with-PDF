import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {createStuffDocumentsChain} from "langchain/chains/combine_documents";
import {createRetrievalChain} from "langchain/chains/retrieval";
import {createHistoryAwareRetriever} from "langchain/chains/history_aware_retriever";
import { PineconeStore } from "@langchain/pinecone";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import pineconeClient from "./pinecone";
import { adminDb } from "../firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage } from "@langchain/core/messages";


export const chatModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
});

// using gemini's state-of-the-art embedding model,native dimension for gemini-embedding-001 is 3072
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-embedding-001", 
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-2.5-flash",
})

export const indexName = "cwp";


async function fetchMessagesFromDB(docId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  console.log("___ Fetching chat history from the firestore database... ___");

  // Get the last 6 messages from the chat history as given
  // const LIMIT = 6;
  const chats = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(docId)
    .collection("chat")
    .orderBy("createdAt", "desc")
    // .limit(LIMIT)
    .get();

    const chatHistory = chats.docs.map((doc) =>
    doc.data().role === "human"
    ? new HumanMessage(doc.data().message)
    : new AIMessage(doc.data().message)
  );
  console.log(
  `___ fetched last ${chatHistory.length} messages successfully ___`
  );

  console.log(chatHistory.map((msg) => msg.content.toString()));

  return chatHistory;
}


// PDF to Split Docs

export async function generateDocs(docId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("User not found");

  console.log("----Fetching file from Firebase----");

  const firebaseRef = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(docId)
    .get();

  const downloadUrl = firebaseRef.data()?.downloadUrl;
  if (!downloadUrl) throw new Error("Download URL not found.");

  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error("Failed to fetch PDF");

  const data = await response.blob();
  const loader = new PDFLoader(data);
  const docs = await loader.load();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await textSplitter.splitDocuments(docs);
  console.log(`Split into ${splitDocs.length} chunks`);

  return splitDocs;
}

// Check Namespace
async function namespaceHasVectors(
  index: Index<RecordMetadata>,
  namespace: string
) {
  const stats = await index.describeIndexStats();
  const ns = stats.namespaces?.[namespace];
  return (ns?.recordCount ?? 0) > 0;
}

// Generate Embeddings
export async function generateEmbeddingsInPineconeVectorStore(docId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("User not found");
  let pineconeVectorStore;

  const index = pineconeClient.index(indexName);

// Avoid redundant work if already processed
const exists = await namespaceHasVectors(index, docId);
if (exists) {
  console.log("Namespace already populated. Skipping embedding.");
  return PineconeStore.fromExistingIndex(embeddings,{
    pineconeIndex: index,
    namespace: docId,
  });
}

  const splitDocs = await generateDocs(docId);

  console.log("--- Verifying Model Dimensions ---");
  const testEmbedding = await embeddings.embedQuery("test");
  console.log("Actual Vector length produced:", testEmbedding.length);

  if (testEmbedding.length !== 3072) {
      throw new Error(`CRITICAL: Model output ${testEmbedding.length} but Pinecone index is 3072.`);
  }

  console.log("--- Storing 3072-dim embeddings in Pinecone ---");
  
  // Create and save the vector store
  pineconeVectorStore =await PineconeStore.fromDocuments(splitDocs, embeddings, {
    pineconeIndex: index,
    namespace: docId,
  });

  console.log("All embeddings stored successfully");
  return pineconeVectorStore;
};

export const generateLangchainCompletion = async (
  docId: string,
  question: string
) => {
  let pineconeVectorStore;

  pineconeVectorStore =
    await generateEmbeddingsInPineconeVectorStore(docId);

  if (!pineconeVectorStore) {
    throw new Error("Pinecone vector store not found");
  }

  // Create a retriever to search through the vector store
  console.log("___ Creating a retriever... ___");
  const retriever = pineconeVectorStore.asRetriever();

  // Fetch the chat history from the database
  const chatHistory = await fetchMessagesFromDB(docId);

// Define a prompt template for generating search queries based on conversation history
console.log("___ Defining a prompt template... ___");

const historyAwarePrompt = ChatPromptTemplate.fromMessages([
  ...chatHistory,                             // Insert the actual chat history here
  ["user", "{input}"],
  [
    "user",
    "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
  ],
]);

// Create a history-aware retriever chain that uses the model, retriever, and prompt
console.log("___ Creating a history-aware retriever chain... ___");

const historyAwareRetrieverChain = await createHistoryAwareRetriever({
  llm: model,
  retriever,
  rephrasePrompt: historyAwarePrompt,
});

// Define a prompt template for answering questions based on retrieved context
console.log("___ Defining a prompt template for answering questions... ___");

const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Answer the user's questions based on the below context:\n\n{context}",
  ],
  ...chatHistory,                           // Insert the actual chat history here
  ["user", "{input}"],
]);

// Create a chain to combine the retrieved documents into a coherent response
console.log("___ Creating a document combining chain... ___");

const historyAwareCombineDocsChain = await createStuffDocumentsChain({
  llm: model,
  prompt: historyAwareRetrievalPrompt,
});

// Create the main retrieval chain that combines the history-aware retriever and document combining chains
console.log("___ Creating the main retrieval chain... ___");

const conversationalRetrievalChain = await createRetrievalChain({
  retriever: historyAwareRetrieverChain,
  combineDocsChain: historyAwareCombineDocsChain,
});


console.log("___ Running the chain with a sample conversation... ___");

const reply = await conversationalRetrievalChain.invoke({
  chat_history: chatHistory,
  input: question,
});

//result to the console
console.log(reply.answer);

return reply.answer;

};

export {model}