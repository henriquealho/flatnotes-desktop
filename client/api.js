import lunr from "lunr";
import * as constants from "./constants.js";
import { Note, SearchResult } from "./classes.js";
import { getToastOptions } from "./helpers.js";

function checkElectronAPI() {
  if (!window.electronAPI) {
    throw new Error(
      "This app must be run as a desktop application with Electron.",
    );
  }
}

async function existsFolder(folder) {
  return await window.electronAPI.exists(folder);
}

async function createFolder(folder) {
  return await window.electronAPI.createDirectory(folder);
}

export async function getNotesFolder() {
  const folder = `${await window.electronAPI.getDefaultDirectory()}\\${constants.NOTES_FOLDER_NAME}`;
  if (!(await existsFolder(folder))) {
    await createFolder(folder);
  }
  return folder;
}

export function apiErrorHandler(error, toast) {
  if (
    error.message ===
    "This app must be run as a desktop application with Electron."
  ) {
    toast.add(
      getToastOptions(
        "Please run this app using 'npm run electron-dev' or 'npm run electron'.",
        "Desktop App Required",
        "error",
      ),
    );
  } else {
    console.error(error);
    toast.add(
      getToastOptions(
        "Unknown error. Please try again.",
        "Unknown Error",
        "error",
      ),
    );
  }
}

export async function getConfig() {
  return {
    allowAttachments: false,
    baseURL: "",
    branding: "",
    customCSS: "",
    dataDir: await getNotesFolder(),
    passwordHash: "",
    passwordSalt: "",
    readOnly: false,
    refreshTokenExpireDays: 0,
    tokenExpireMinutes: 0,
    username: "",
    quickAccessTitle: "Recent Notes",
    quickAccessTerm: "",
    quickAccessSort: "lastModified",
    quickAccessLimit: 5,
    quickAccessHide: false,
    hideRecentlyModified: false,
  };
}

function extractTags(content) {
  const matches = content.match(/#([a-zA-Z0-9_-]+)/g) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

function highlightText(text, matchedTerms) {
  if (!matchedTerms || matchedTerms.length === 0) return null;
  const escapedTerms = matchedTerms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  const highlighted = text.replace(regex, "<mark>$1</mark>");
  return highlighted !== text ? highlighted : null;
}

function extractSnippet(content, matchedTerms, snippetLength = 200) {
  if (!matchedTerms || matchedTerms.length === 0) return null;
  const lowerContent = content.toLowerCase();
  let firstMatchIndex = -1;
  for (const term of matchedTerms) {
    const idx = lowerContent.indexOf(term.toLowerCase());
    if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
      firstMatchIndex = idx;
    }
  }
  if (firstMatchIndex === -1) return null;
  const start = Math.max(0, firstMatchIndex - 60);
  const end = Math.min(content.length, start + snippetLength);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "\u2026" + snippet;
  if (end < content.length) snippet = snippet + "\u2026";
  return highlightText(snippet, matchedTerms) ?? snippet;
}

async function parseNoteFromFile(fileName, content) {
  const title = fileName.replace(/\.md$/, "");
  const filePath = `${await getNotesFolder()}/${fileName}`;
  const stats = await window.electronAPI.stat(filePath);
  return new Note({
    title,
    content,
    lastModified: Math.floor(stats.mtime.getTime() / 1000),
  });
}

export async function getNotes(term, sort, order, limit) {
  const notesFolder = await getNotesFolder();
  if (!notesFolder) return [];

  checkElectronAPI();
  const files = await window.electronAPI.readDirectory(notesFolder);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  let notes = [];
  for (const file of mdFiles) {
    const content = await window.electronAPI.readFile(`${notesFolder}/${file}`);
    const note = await parseNoteFromFile(file, content);
    notes.push(note);
  }

  // Full-text search with Lunr
  if (term && term !== "*") {
    const tagTerms = (term.match(/#([a-zA-Z0-9_-]+)/g) || []).map((t) =>
      t.slice(1).toLowerCase(),
    );
    const regularTerm = term.replace(/#([a-zA-Z0-9_-]+)/g, "").trim();

    // Build lunr index
    const idx = lunr(function () {
      this.metadataWhitelist = ["position"];
      this.field("title", { boost: 2 });
      this.field("content");
      this.field("tags", { boost: 3 });
      // Disable the stemmer so that partial/wildcard matches work as expected
      this.pipeline.remove(lunr.stemmer);
      this.searchPipeline.remove(lunr.stemmer);

      notes.forEach((note, i) => {
        this.add({
          id: String(i),
          title: note.title,
          content: note.content,
          tags: extractTags(note.content).join(" "),
        });
      });
    });

    // Build lunr query — add trailing wildcard for prefix matching
    const buildQuery = (q) => {
      q.term(regularTerm + "*", {
        fields: ["title", "content"],
        boost: 1,
        wildcard: lunr.Query.wildcard.TRAILING,
        presence: lunr.Query.presence.OPTIONAL,
      });
      tagTerms.forEach((tag) => {
        q.term(tag + "*", {
          fields: ["tags"],
          boost: 3,
          wildcard: lunr.Query.wildcard.TRAILING,
          presence: lunr.Query.presence.REQUIRED,
        });
      });
    };

    let lunrResults = [];
    try {
      if (regularTerm || tagTerms.length > 0) {
        lunrResults = idx.query(buildQuery);
      }
    } catch {
      lunrResults = [];
    }

    // When searching only by #tag, verify tags actually match (lunr stems tokens)
    if (tagTerms.length > 0 && !regularTerm) {
      lunrResults = lunrResults.filter((r) => {
        const noteTags = extractTags(notes[Number(r.ref)].content);
        return tagTerms.every((tagTerm) =>
          noteTags.some((t) => t.startsWith(tagTerm)),
        );
      });
    }

    // Collect matched terms for highlighting from lunr metadata
    let results = lunrResults.map((result) => {
      const note = notes[Number(result.ref)];
      const matchedTerms = Object.keys(result.matchData.metadata);
      const noteTags = extractTags(note.content);
      const tagMatches =
        tagTerms.length > 0
          ? noteTags.filter((t) =>
              tagTerms.some((tagTerm) => t.startsWith(tagTerm)),
            )
          : [];

      return new SearchResult({
        ...note,
        score: result.score,
        titleHighlights: highlightText(note.title, matchedTerms),
        contentHighlights: extractSnippet(note.content, matchedTerms),
        tagMatches,
      });
    });

    if (sort === "title") {
      results.sort((a, b) =>
        order === "asc"
          ? a.title.toLowerCase().localeCompare(b.title.toLowerCase())
          : b.title.toLowerCase().localeCompare(a.title.toLowerCase()),
      );
    } else if (sort === "lastModified") {
      results.sort((a, b) =>
        order === "asc"
          ? a.lastModified - b.lastModified
          : b.lastModified - a.lastModified,
      );
    }

    if (limit) results = results.slice(0, limit);
    return results;
  }

  // No search term: sort and limit all notes
  notes.sort((a, b) => {
    let aVal, bVal;
    if (sort === "title") {
      aVal = a.title.toLowerCase();
      bVal = b.title.toLowerCase();
    } else {
      aVal = a.lastModified;
      bVal = b.lastModified;
    }
    return order === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  if (limit) notes = notes.slice(0, limit);
  return notes.map((note) => new SearchResult(note));
}

export async function createNote(title, content) {
  const notesFolder = await getNotesFolder();
  if (!notesFolder) throw new Error("No notes folder selected");
  checkElectronAPI();
  const fileName = `${title}.md`;
  const filePath = `${notesFolder}/${fileName}`;
  await window.electronAPI.writeFile(filePath, content);
  const stats = await window.electronAPI.stat(filePath);
  return new Note({
    title,
    content,
    lastModified: Math.floor(stats.mtime.getTime() / 1000),
  });
}

export async function getNote(title) {
  const notesFolder = await getNotesFolder();
  if (!notesFolder) throw new Error("No notes folder selected");

  checkElectronAPI();
  const fileName = `${title}.md`;
  const filePath = `${notesFolder}/${fileName}`;
  const content = await window.electronAPI.readFile(filePath);
  const stats = await window.electronAPI.stat(filePath);
  return new Note({
    title,
    content,
    lastModified: Math.floor(stats.mtime.getTime() / 1000),
  });
}

export async function updateNote(title, newTitle, newContent) {
  const notesFolder = await getNotesFolder();
  if (!notesFolder) throw new Error("No notes folder selected");

  checkElectronAPI();
  const oldFileName = `${title}.md`;
  const newFileName = `${newTitle}.md`;

  if (title !== newTitle) {
    await window.electronAPI.deleteFile(`${notesFolder}/${oldFileName}`);
  }

  const filePath = `${notesFolder}/${newFileName}`;
  await window.electronAPI.writeFile(filePath, newContent);
  const stats = await window.electronAPI.stat(filePath);
  return new Note({
    title: newTitle,
    content: newContent,
    lastModified: Math.floor(stats.mtime.getTime() / 1000),
  });
}

export async function deleteNote(title) {
  const notesFolder = await getNotesFolder();
  if (!notesFolder) throw new Error("No notes folder selected");

  checkElectronAPI();
  const fileName = `${title}.md`;
  await window.electronAPI.deleteFile(`${notesFolder}/${fileName}`);
}

export async function getTags() {
  const notesFolder = await getNotesFolder();
  if (!notesFolder) return [];
  checkElectronAPI();
  const files = await window.electronAPI.readDirectory(notesFolder);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const allTags = new Set();
  for (const file of mdFiles) {
    const content = await window.electronAPI.readFile(`${notesFolder}/${file}`);
    for (const tag of extractTags(content)) {
      allTags.add(tag);
    }
  }
  return [...allTags].sort();
}

export async function createAttachment(file) {
  checkElectronAPI();
  const attachmentsFolder = await getAttachmentsFolder();

  // Sanitize the original filename: replace reserved filesystem characters
  const safeOriginalName =
    (file.name || "image").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() ||
    "image";

  // Split into base name and extension
  const lastDot = safeOriginalName.lastIndexOf(".");
  const baseName =
    lastDot > 0 ? safeOriginalName.slice(0, lastDot) : safeOriginalName;
  const ext =
    lastDot > 0
      ? safeOriginalName.slice(lastDot + 1).toLowerCase()
      : (() => {
          const mimeToExt = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/gif": "gif",
            "image/webp": "webp",
          };
          return mimeToExt[file.type] || "bin";
        })();

  // Find a non-conflicting filename
  let filename = `${baseName}.${ext}`;
  let counter = 1;
  while (await window.electronAPI.exists(`${attachmentsFolder}/${filename}`)) {
    filename = `${baseName}-${counter}.${ext}`;
    counter++;
  }

  const filePath = `${attachmentsFolder}/${filename}`;
  const arrayBuffer = await file.arrayBuffer();
  await window.electronAPI.writeBinaryFile(filePath, arrayBuffer);

  // Build a properly encoded file:// URL.
  // Each path segment is encoded individually so spaces and other special
  // characters in folder/file names don't
  // break the URL, while drive-letter colons and separators are preserved.
  const segments = filePath.replace(/\\/g, "/").split("/");
  const encodedPath = segments
    .map((seg, i) =>
      // Keep the Windows drive letter (e.g. "C:") as-is
      i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg),
    )
    .join("/");
  const fileUrl = `file:///${encodedPath}`;
  return { filename, url: fileUrl, path: filePath };
}

export async function deleteAttachment(filePath) {
  checkElectronAPI();
  try {
    await window.electronAPI.deleteFile(filePath);
  } catch {
    // File may already be absent — ignore
  }
}
