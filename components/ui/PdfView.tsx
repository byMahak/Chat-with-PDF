'use client'

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Document, Page, pdfjs } from "react-pdf";
import { useEffect, useState } from "react";
import { Loader2Icon, RotateCw, ZoomIn, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { Button } from "./button";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function PdfView({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [File, setFile] = useState<Blob | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);

  useEffect(() => {
    const fetchFile = async () => {
      const response = await fetch(url);
      const blob = await response.blob();
      setFile(blob);
    };
    fetchFile();
  }, [url]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }):void => {
    setNumPages(numPages);
  };

return (
    <div className="flex flex-col h-full overflow-hidden"> 
      {/* TOOLBAR: Always visible at the top */}
      <div className="sticky top-0 z-50 bg-white border-b p-2 flex justify-center items-center shadow-sm"> 
        <div className="max-w-6xl px-2 grid grid-cols-6 gap-2"> 
          <Button 
            variant="outline" 
            disabled={pageNumber === 1} 
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))} 
          > 
            Previous 
          </Button> 
          
          <p className="flex items-center justify-center text-sm font-medium"> 
            {pageNumber} of {numPages} 
          </p> 
            
          <Button 
            variant="outline" 
            disabled={pageNumber === numPages} 
            onClick={() => { 
              if (numPages && pageNumber < numPages) setPageNumber(pageNumber + 1); 
            }} 
          > 
            Next 
          </Button> 

          <Button variant="outline" onClick={() => setRotation((rotation + 90) % 360)}>
            <RotateCw className="h-4 w-4"/>
          </Button>
          
          <Button
            variant="outline"
            disabled={scale >= 1.5}
            onClick={() => setScale(scale * 1.2)}
          >
            <ZoomInIcon className="h-4 w-4"/>
          </Button>

          <Button
            variant="outline"
            disabled={scale <= 0.75}
            onClick={() => setScale(scale / 1.2)}
          >
            <ZoomOutIcon className="h-4 w-4"/>
          </Button>
        </div> 
      </div>

      {/* PDF CONTENT: This part scrolls */}
      <div className="flex-1 h-screen bg-gray-200 p-4 flex justify-center min-h-0 overflow-y-auto overflow-x-hidden">
        {!File? (
          <div className="flex items-center justify-center mt-20">
            <Loader2Icon className="animate-spin h-20 w-20 text-indigo-600" />
          </div>
        ) : (
          <Document
            file={url}
            loading={null}
            rotate={rotation}
            scale={scale}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >
            <Page 
              pageNumber={pageNumber} 
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>
        )}
      </div>
    </div>
  );
}

export default PdfView;


// NOT NEEDED FOR SUPABASE : 
// we need to configure CORS
// gsutil cors set cors.json gs://<app-name>.appspot.com
// go here >>> https://console.cloud.google.com/
// create new file in editor calls cors.json
// run >>> // gsutil cors set cors.json gs://<app-name>.appspot.com
// https://firebase.google.com/docs/storage/web/download-files#cors-configuration