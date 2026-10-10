
const { PDFParse } = require("pdf-parse");

async function extractText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("The uploaded PDF is empty or invalid.");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = (result.text || "").trim();

    if (!text) {
      throw new Error(
        "No readable text found in the PDF. Try exporting it again or using a text-based PDF."
      );
    }

    return {
      text,
      meta: {
        pageCount: result.pages?.length ?? null,
      },
    };
  } finally {
    await parser.destroy();
  }
}

module.exports = { extractText };
