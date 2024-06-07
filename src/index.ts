import fs from "node:fs";
import os from "node:os";

import {glob} from "glob";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { Annotation, Book } from "./types.ts";

const username = os.userInfo().username;
const ANNOTATION_DB_PATH = `/users/${username}/Library/Containers/com.apple.iBooksX/Data/Documents/AEAnnotation/`;
const BOOK_DB_PATH = `/users/${username}/Library/Containers/com.apple.iBooksX/Data/Documents/BKLibrary/`;
const annotationsFiles = glob.sync(`${ANNOTATION_DB_PATH}/*.sqlite`);
const booksFiles = glob.sync(`${BOOK_DB_PATH}/*.sqlite`);

const SELECT_ALL_ANNOTATIONS_QUERY = `select 
  ZANNOTATIONASSETID as assetId,
  ZANNOTATIONSELECTEDTEXT as quote,
  ZANNOTATIONNOTE as comment,
  ZFUTUREPROOFING5 as chapter,
  ZANNOTATIONSTYLE as colorCode,
  ZANNOTATIONMODIFICATIONDATE as modifiedAt,
  ZANNOTATIONCREATIONDATE as createdAt
from ZAEANNOTATION
where ZANNOTATIONDELETED = 0 
  and ZANNOTATIONSELECTEDTEXT is not null 
  and ZANNOTATIONSELECTEDTEXT <> ''
order by ZANNOTATIONASSETID, ZPLLOCATIONRANGESTART;
`;

const SELECT_ALL_BOOKS_QUERY = `select 
  ZASSETID as id, 
  ZTITLE as title, 
  ZAUTHOR as author 
from ZBKLIBRARYASSET`;

async function createDB(filename: string) {
  return await open({
    filename: filename,
    driver: sqlite3.Database,
  });
}

async function getBooksFromDBFile(filename: string): Promise<Book[]> {
  const db = await createDB(filename);
  return await db.all<Book[]>(SELECT_ALL_BOOKS_QUERY);
}

async function getBooks() {
  const books = await Promise.all(booksFiles.map(getBooksFromDBFile));
  console.log("Books", books);
  return books.flat();
}

async function getAnnotationsFromDBFile(filename: string) {
  const db = await createDB(filename);
  return await db.all<Annotation[]>(SELECT_ALL_ANNOTATIONS_QUERY);
}

async function getAnnotations() {
  const annotations = await Promise.all(
    annotationsFiles.map(getAnnotationsFromDBFile)
  );
  return annotations.flat();
}

const APPLE_EPOCH_START = new Date("2001-01-01").getTime();

function convertAppleTime(appleTime: number): number {
  return new Date(APPLE_EPOCH_START + appleTime * 1000).getTime();
}

async function getTablesInfo(){
  console.log("booksFiles", booksFiles);
  let json = {};
  await Promise.all(booksFiles.map(async (file) => {
    const db = await createDB(file);
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table';`);
    console.log("Tables in", file, tables);
    // pragma to get table info
    for (const table of tables) {
      
      const tableInfo = await db.all(`PRAGMA table_info(${table.name});`);
      console.log("Table Info for", table.name, tableInfo);
      json[table.name] = {
        ...json[table],
        name: table.name,
        columns: tableInfo
      }
    }
  }))

  fs.writeFileSync("tables.json", JSON.stringify(json));
}

(async function main() {
  await getTablesInfo();
  // const books = await getBooks();
  // const annotations = await getAnnotations();
  // const booksByAssetId: Record<Book["id"], Book> = {};
  // const output = annotations.map(
  //   ({ assetId, modifiedAt, createdAt, ...annotation }) => {
  //     if (booksByAssetId[assetId] === undefined) {
  //       const book = books.find((b) => b.id === assetId);
  //       if (book) {
  //         booksByAssetId[assetId] = book;
  //       }
  //     }
  //     const book = booksByAssetId[assetId];

  //     // console.log("Processing book", book);
  //     return {
  //       ...annotation,
  //       modifiedAt: convertAppleTime(modifiedAt),
  //       createdAt: convertAppleTime(createdAt),
  //       author: book?.author ?? "Unknown Author",
  //       title: book?.title ?? "Unknown Title",
  //     };
  //   }
  // );
  // fs.writeFileSync("output.json", JSON.stringify(output));
  // console.log("Exported", output.length, "items");
})();