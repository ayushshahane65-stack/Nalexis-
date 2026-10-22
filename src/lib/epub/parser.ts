import type { ParsedEpub, EpubMetadata, EpubChapter } from "./types";

interface ZipEntry {
  filename: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/**
 * Native client-side ZIP archive reader using Web APIs and DecompressionStream.
 * Zero npm dependencies required.
 */
class SimpleZipReader {
  private buffer: Uint8Array;
  private view: DataView;
  private entries: Map<string, ZipEntry> = new Map();

  constructor(arrayBuffer: ArrayBuffer) {
    this.buffer = new Uint8Array(arrayBuffer);
    this.view = new DataView(arrayBuffer);
    this.parseCentralDirectory();
  }

  private parseCentralDirectory(): void {
    // Search backwards for End of Central Directory (EOCD) record: 0x06054b50
    const len = this.buffer.length;
    let eocdOffset = -1;
    const maxSearch = Math.min(len, 65557 + 22);

    for (let i = len - 22; i >= len - maxSearch; i--) {
      if (
        this.buffer[i] === 0x50 &&
        this.buffer[i + 1] === 0x4b &&
        this.buffer[i + 2] === 0x05 &&
        this.buffer[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error("Invalid EPUB: End of Central Directory record not found.");
    }

    const totalEntries = this.view.getUint16(eocdOffset + 10, true);
    const cdOffset = this.view.getUint32(eocdOffset + 16, true);

    let offset = cdOffset;
    const decoder = new TextDecoder("utf-8");

    for (let i = 0; i < totalEntries && offset < len; i++) {
      const signature = this.view.getUint32(offset, true);
      if (signature !== 0x02014b50) break; // Central Directory header magic

      const compressionMethod = this.view.getUint16(offset + 10, true);
      const compressedSize = this.view.getUint32(offset + 20, true);
      const uncompressedSize = this.view.getUint32(offset + 24, true);
      const filenameLength = this.view.getUint16(offset + 28, true);
      const extraLength = this.view.getUint16(offset + 30, true);
      const commentLength = this.view.getUint16(offset + 32, true);
      const localHeaderOffset = this.view.getUint32(offset + 42, true);

      const filenameBytes = this.buffer.subarray(offset + 46, offset + 46 + filenameLength);
      const filename = decoder.decode(filenameBytes);

      this.entries.set(filename, {
        filename,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      });

      offset += 46 + filenameLength + extraLength + commentLength;
    }
  }

  public getFilenames(): string[] {
    return Array.from(this.entries.keys());
  }

  public hasFile(path: string): boolean {
    return this.entries.has(path) || this.entries.has(path.replace(/^\//, ""));
  }

  public async getFileBytes(path: string): Promise<Uint8Array | null> {
    const cleanPath = path.replace(/^\//, "");
    let entry = this.entries.get(cleanPath);

    if (!entry) {
      // Case-insensitive or normalized search fallback
      const lower = cleanPath.toLowerCase();
      for (const [key, val] of this.entries.entries()) {
        if (key.toLowerCase() === lower) {
          entry = val;
          break;
        }
      }
    }

    if (!entry) return null;

    // Read local header to get precise start of compressed data
    const localOffset = entry.localHeaderOffset;
    const localSig = this.view.getUint32(localOffset, true);
    if (localSig !== 0x04034b50) {
      throw new Error(`Corrupted ZIP local header for: ${cleanPath}`);
    }

    const localFilenameLength = this.view.getUint16(localOffset + 26, true);
    const localExtraLength = this.view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localFilenameLength + localExtraLength;
    const compressedData = this.buffer.subarray(dataStart, dataStart + entry.compressedSize);

    if (entry.compressionMethod === 0) {
      // Stored (no compression)
      return compressedData;
    } else if (entry.compressionMethod === 8) {
      // Deflate compression via Web API DecompressionStream
      try {
        const ds = new DecompressionStream("deflate-raw");
        const blob = new Blob([compressedData as unknown as BlobPart]);
        const decompressedResponse = new Response(blob.stream().pipeThrough(ds));
        const arrayBuf = await decompressedResponse.arrayBuffer();
        return new Uint8Array(arrayBuf);
      } catch (err) {
        throw new Error(`Failed decompressing ${cleanPath}: ${String(err)}`);
      }
    } else {
      throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`);
    }
  }

  public async getFileText(path: string): Promise<string | null> {
    const bytes = await this.getFileBytes(path);
    if (!bytes) return null;
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/**
 * Resolves relative paths within an EPUB archive (e.g. "OEBPS/content.opf" + "chapter1.xhtml" -> "OEBPS/chapter1.xhtml")
 */
function resolvePath(baseFile: string, relativePath: string): string {
  if (relativePath.startsWith("/")) return relativePath.slice(1);
  const baseParts = baseFile.split("/").slice(0, -1);
  const relParts = relativePath.split("/");

  for (const part of relParts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return baseParts.join("/");
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Main parser entry point: parses an EPUB file into a structured book object.
 */
export async function parseEpubFile(file: File | Blob | ArrayBuffer): Promise<ParsedEpub> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const fileSize = arrayBuffer.byteLength;
  let zip: SimpleZipReader;
  try {
    zip = new SimpleZipReader(arrayBuffer);
  } catch {
    throw new Error("Not a valid EPUB");
  }

  // DRM Protection Checks
  if (zip.hasFile("META-INF/rights.xml")) {
    throw new Error("This book is protected and can't be opened here.");
  }
  if (zip.hasFile("META-INF/encryption.xml")) {
    const encXml = await zip.getFileText("META-INF/encryption.xml");
    if (encXml) {
      const p = new DOMParser();
      const encDoc = p.parseFromString(encXml, "application/xml");
      const encryptedDataList = encDoc.querySelectorAll("EncryptedData");
      for (let k = 0; k < encryptedDataList.length; k++) {
        const ed = encryptedDataList[k];
        const cipherRef = ed.querySelector("CipherReference")?.getAttribute("URI") || "";
        const method = ed.querySelector("EncryptionMethod")?.getAttribute("Algorithm") || "";
        // IDPF or Adobe font mangling is not content DRM
        const isFont = method.includes("embedding") || method.includes("enc#RC") || /\.(otf|ttf|woff|woff2)$/i.test(cipherRef);
        if (!isFont || method.includes("adept") || method.includes("lcp") || method.includes("fairplay")) {
          throw new Error("This book is protected and can't be opened here.");
        }
      }
    }
  }

  // 1. Read META-INF/container.xml
  const containerXml = await zip.getFileText("META-INF/container.xml");
  if (!containerXml) {
    throw new Error("Not a valid EPUB");
  }

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "application/xml");
  const rootfile = containerDoc.querySelector("rootfile");
  const opfPath = rootfile?.getAttribute("full-path");

  if (!opfPath) {
    throw new Error("Not a valid EPUB");
  }

  // 2. Read OPF file
  const opfXml = await zip.getFileText(opfPath);
  if (!opfXml) {
    throw new Error("Not a valid EPUB");
  }

  const opfDoc = parser.parseFromString(opfXml, "application/xml");

  // 3. Extract Dublin Core Metadata
  const getDc = (tag: string) => {
    const el =
      opfDoc.querySelector(`metadata dc\\:${tag}`) ||
      opfDoc.querySelector(`metadata ${tag}`) ||
      opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", tag)[0];
    return el?.textContent?.trim() || "";
  };

  const title = getDc("title") || "Untitled Volume";
  const creator = getDc("creator") || "Unknown Author";
  const language = getDc("language") || "en";
  const description = getDc("description") || "No synopsis available for this EPUB volume.";
  const publisher = getDc("publisher") || undefined;
  const pubDate = getDc("date") || undefined;
  const rights = getDc("rights") || undefined;
  const identifier = getDc("identifier") || `epub-${Date.now()}`;

  // 4. Build Manifest Map
  interface ManifestItem {
    id: string;
    href: string;
    mediaType: string;
    properties?: string;
    fullPath: string;
  }

  const manifest = new Map<string, ManifestItem>();
  const items = opfDoc.querySelectorAll("manifest item");
  items.forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mediaType = item.getAttribute("media-type") || "";
    const properties = item.getAttribute("properties") || "";

    if (id && href) {
      manifest.set(id, {
        id,
        href,
        mediaType,
        properties,
        fullPath: resolvePath(opfPath, href),
      });
    }
  });

  // 5. Extract Cover Image
  let coverUrl: string | undefined = undefined;

  // Method A: Check <meta name="cover" content="item_id">
  const coverMeta =
    opfDoc.querySelector('metadata meta[name="cover"]') ||
    opfDoc.querySelector('metadata meta[property="cover-image"]');
  const coverId = coverMeta?.getAttribute("content") || coverMeta?.getAttribute("id");

  let coverItem = coverId ? manifest.get(coverId) : undefined;

  // Method B: Check manifest properties="cover-image"
  if (!coverItem) {
    for (const item of manifest.values()) {
      if (item.properties?.includes("cover-image") || item.id.toLowerCase() === "cover-image" || item.id.toLowerCase() === "cover") {
        coverItem = item;
        break;
      }
    }
  }

  // Method C: Check any image with 'cover' in its filename
  if (!coverItem) {
    for (const item of manifest.values()) {
      if (item.mediaType.startsWith("image/") && item.href.toLowerCase().includes("cover")) {
        coverItem = item;
        break;
      }
    }
  }

  // Extract cover bytes
  if (coverItem) {
    const coverBytes = await zip.getFileBytes(coverItem.fullPath);
    if (coverBytes) {
      const mime = coverItem.mediaType || getMimeType(coverItem.fullPath);
      coverUrl = `data:${mime};base64,${uint8ArrayToBase64(coverBytes)}`;
    }
  }

  // 6. Extract Table of Contents titles if available (NCX or HTML5 Nav)
  const tocMap = new Map<string, string>(); // href -> Title
  let ncxItem: ManifestItem | undefined;

  for (const item of manifest.values()) {
    if (item.mediaType === "application/x-dtbncx+xml") {
      ncxItem = item;
      break;
    }
  }

  if (ncxItem) {
    const ncxXml = await zip.getFileText(ncxItem.fullPath);
    if (ncxXml) {
      const ncxDoc = parser.parseFromString(ncxXml, "application/xml");
      const navPoints = ncxDoc.querySelectorAll("navPoint");
      navPoints.forEach((np) => {
        const text = np.querySelector("navLabel text")?.textContent?.trim();
        const contentSrc = np.querySelector("content")?.getAttribute("src");
        if (text && contentSrc) {
          const resolvedSrc = resolvePath(ncxItem!.fullPath, contentSrc.split("#")[0]);
          tocMap.set(resolvedSrc, text);
        }
      });
    }
  }

  // 7. Extract Chapters in Spine order
  const spineItemrefs = opfDoc.querySelectorAll("spine itemref");
  const chapters: EpubChapter[] = [];
  let chapterIndex = 1;

  for (let i = 0; i < spineItemrefs.length; i++) {
    const idref = spineItemrefs[i].getAttribute("idref");
    if (!idref) continue;

    const manifestItem = manifest.get(idref);
    if (!manifestItem) continue;

    const rawChapterHtml = await zip.getFileText(manifestItem.fullPath);
    if (!rawChapterHtml) continue;

    // Parse and sanitize chapter HTML
    const chapterDoc = parser.parseFromString(rawChapterHtml, "text/html");

    // Remove scripts and style tags for safety & consistency
    chapterDoc.querySelectorAll("script, link[rel='stylesheet']").forEach((el) => el.remove());

    // Resolve inline images: replace relative src with data URIs
    const imgElements = chapterDoc.querySelectorAll("img, image");
    for (let j = 0; j < imgElements.length; j++) {
      const img = imgElements[j];
      const src = img.getAttribute("src") || img.getAttribute("xlink:href");
      if (src && !src.startsWith("data:") && !src.startsWith("http")) {
        const imageFullPath = resolvePath(manifestItem.fullPath, src);
        const imgBytes = await zip.getFileBytes(imageFullPath);
        if (imgBytes) {
          const mime = getMimeType(imageFullPath);
          const dataUri = `data:${mime};base64,${uint8ArrayToBase64(imgBytes)}`;
          img.setAttribute("src", dataUri);
          img.removeAttribute("xlink:href");
        }
      }
    }

    // Determine Chapter Title
    let chapterTitle = tocMap.get(manifestItem.fullPath);
    if (!chapterTitle) {
      const h1 = chapterDoc.querySelector("h1, h2, h3, title");
      chapterTitle = h1?.textContent?.trim() || `Chapter ${chapterIndex}`;
    }

    // Clean body HTML content
    const bodyContent = chapterDoc.body?.innerHTML || rawChapterHtml;

    chapters.push({
      id: manifestItem.id,
      href: manifestItem.href,
      title: chapterTitle,
      htmlContent: bodyContent,
      order: chapterIndex,
    });

    chapterIndex++;
  }

  const bookId =
    "epub-" +
    (identifier || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 32);

  const metadata: EpubMetadata = {
    title,
    creator,
    language,
    description,
    publisher,
    pubDate,
    rights,
    identifier,
    coverUrl,
  };

  return {
    id: bookId,
    metadata,
    chapters,
    totalChapters: chapters.length,
    fileSize,
    addedAt: new Date().toISOString(),
  };
}
