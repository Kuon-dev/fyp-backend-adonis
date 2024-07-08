// import { TextLoader } from "langchain/document_loaders/fs/text";
// import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const doc = 'code-guideline.pdf'
const loader = new PDFLoader(`./public/assets/${doc}`, {
  splitPages: false,
});

export const pdfDocReader = await loader.load();
