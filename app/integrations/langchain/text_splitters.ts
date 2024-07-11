import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'

const recursiveSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 10,
  chunkOverlap: 1,
})

export const recursiveSplitterOutput = async (text: any) => {
  return await recursiveSplitter.splitDocuments([new Document({ pageContent: text })])
}
