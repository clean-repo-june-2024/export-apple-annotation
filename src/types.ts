// Book, but could be a sample or an article in PDF
export interface Book {
  id: string;
  title: string | null;
  author: string | null;
}

export interface Annotation {
  assetId: string; // pointer to Book.id
  quote: string | null;
  comment: string | null;
  chapter: string | null;
  colorCode: number;
  modifiedAt: number;
  createdAt: number;
}