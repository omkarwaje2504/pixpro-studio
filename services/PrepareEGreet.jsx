"use clients";

import UploadFile from "./uploadFile";
import jsPDF from "jspdf";
import PDFMerger from "pdf-merger-js";

const slugify = (str) => {
  str = str.replace(/^\s+|\s+$/g, "");
  str = str.toLowerCase();
  str = str
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return str;
};

export const downloadECard = async (projectInfo, formData) => {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const backgroundBlobUrl = await loadImageWithProxy(
      projectInfo.artworks[0].thumbnail
    );
    const doctorBlobUrl = await loadImageWithProxy(
      formData.doctorDetails.photo
    );

    const backgroundImage = new Image();
    const doctorImage = new Image();

    backgroundImage.crossOrigin = "anonymous";
    doctorImage.crossOrigin = "anonymous";

    const loadBackground = new Promise((resolve, reject) => {
      backgroundImage.onload = () => resolve();
      backgroundImage.onerror = reject;
      backgroundImage.src = backgroundBlobUrl;
    });

    const loadDoctor = new Promise((resolve, reject) => {
      doctorImage.onload = () => resolve();
      doctorImage.onerror = reject;
      doctorImage.src = doctorBlobUrl;
    });
    await Promise.all([loadBackground, loadDoctor]);
    canvas.width = backgroundImage.width;
    canvas.height = backgroundImage.height;

    ctx.drawImage(
      doctorImage,
      projectInfo.artworks[0].settings.photo_x,
      projectInfo.artworks[0].settings.photo_y,
      projectInfo.artworks[0].settings.photo_width,
      projectInfo.artworks[0].settings.photo_height
    );
    ctx.drawImage(backgroundImage, 0, 0);

    const textElements = [
      {
        text: `${formData.doctorDetails.name}`,
        x: projectInfo.artworks[0].settings.name_x || 50,
        y: parseInt(projectInfo.artworks[0].settings.name_y) + 28 || 50,
        font: `bold ${projectInfo.artworks[0].settings.name_font_size}px Arial`,
        color: projectInfo.artworks[0].settings.name_font_color,
        align: projectInfo.artworks[0].settings.name_align,
        maxWidth: projectInfo.artworks[0].settings.name_max_width || 500,
        lineHeight:
          parseInt(projectInfo.artworks[0].settings.name_font_size) * 1.2,
      },
    ];

    textElements.forEach(
      ({ text, x, y, font, color, align, maxWidth, lineHeight }) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;

        // Calculate text lines first
        const words = text.split(" ");
        const lines = [];
        let currentLine = "";

        words.forEach((word) => {
          const testLine = currentLine + word + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine !== "") {
            lines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine.trim() !== "") {
          lines.push(currentLine.trim());
        }

        // Calculate vertical offset from center
        const totalHeight = (lines.length - 1) * lineHeight;
        const startY = y - totalHeight / 2;

        // Draw text lines
        lines.forEach((line, index) => {
          const currentY = startY + index * lineHeight;
          ctx.fillText(line, x, currentY);
        });
      }
    );

    if (projectInfo.features.includes("pdf_ecard")) {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [canvas.width / 300, canvas.height / 300],
      });

      const imageData = canvas.toDataURL("image/png");
      pdf.addImage(
        imageData,
        "PNG",
        0,
        0,
        canvas.width / 300,
        canvas.height / 300
      );
      const fileName = `${slugify(formData.doctorDetails.name)}-eCard.pdf`;
      const pdfBlob = pdf.output("blob");

      const firstPdfUrl = URL.createObjectURL(pdfBlob);
      const defaultArtwork = projectInfo.artworks[0];
      const secondPdfUrl = defaultArtwork?.video;

      var merger = new PDFMerger();

      await merger.add(firstPdfUrl);
      await merger.add(secondPdfUrl);

      const mergeFileBuffer = await merger.saveAsBuffer();
      const fileUrl = await UploadFile(mergeFileBuffer, fileName, "pdf");
      return fileUrl;
    } else {
      return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) return reject("Failed to generate blob.");
          const fileName = `${slugify(formData.doctorDetails.name)}-eCard.png`;
          const fileUrl = await UploadFile(blob, fileName, "image");
          resolve(fileUrl);
        }, "image/png");
      });
    }
  } catch (error) {
    console.error("Error generating E-Card:", error);
    return null;
  }
};

export const NfcCard = async (projectInfo, formData) => {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const backgroundBlobUrl = await loadImageWithProxy(
      formData.doctorDetails.email
        ? projectInfo.artworks[0].video
        : projectInfo.artworks[0].thumbnail
    );
    
    const doctorBlobUrl = await loadImageWithProxy(
      formData.doctorDetails.photo
    );

    const backgroundImage = new Image();
    const doctorImage = new Image();

    backgroundImage.crossOrigin = "anonymous";
    doctorImage.crossOrigin = "anonymous";

    const loadBackground = new Promise((resolve, reject) => {
      backgroundImage.onload = () => resolve();
      backgroundImage.onerror = reject;
      backgroundImage.src = backgroundBlobUrl;
    });

    const loadDoctor = new Promise((resolve, reject) => {
      doctorImage.onload = () => resolve();
      doctorImage.onerror = reject;
      doctorImage.src = doctorBlobUrl;
    });

    await Promise.all([loadBackground, loadDoctor]);

    canvas.width = backgroundImage.width;
    canvas.height = backgroundImage.height;

    // Draw background first
    ctx.drawImage(
      doctorImage,
      projectInfo.artworks[0].settings.photo_x,
      projectInfo.artworks[0].settings.photo_y,
      projectInfo.artworks[0].settings.photo_width,
      projectInfo.artworks[0].settings.photo_height
    ); // Adjust these values as needed
    ctx.drawImage(backgroundImage, 0, 0);

    // Draw doctor photo (assumed right-side placement)

    // Font registration (if Amperzand is locally available via CSS, otherwise use a fallback)
    const fontFamily = "Amperzand, serif";
    // 🔽 Wait for font to be fully available
    await document.fonts.load(`bold 215px ${fontFamily}`);
    await document.fonts.ready;

    // Text rendering
    const textElements = [
      {
        text:
          (formData.doctorDetails.name
            .split(" ")
            .find((p) => p.toLowerCase() !== "dr.") || "")[0] || "",
        x: 670,
        y: 240,
        font: `bold 215px ${fontFamily} `,
        color: "#e8bf62",
        align: "center",
        maxWidth: 500,
        lineHeight: 44,
      },
      {
        text: formData.doctorDetails.name || "",
        x: 670,
        y: 330,
        font: `bold 45px ${fontFamily}`,
        color: "#ffffff",
        align: "center",
        maxWidth: 500,
        lineHeight: 44,
      },
      {
        text: formData.doctorDetails.name || "",
        x: 900,
        y: 670,
        font: `bold 40px ${fontFamily}`,
        color: "#ffffff",
        align: "right",
        maxWidth: 500,
        lineHeight: 44,
      },
      {
        text: formData.doctorDetails.speciality || "",
        x: 900,
        y: 720,
        font: `33px ${fontFamily}`,
        color: "#ffffff",
        align: "right",
        maxWidth: 500,
        lineHeight: 34,
      },
      {
        text: formData.doctorDetails.clinic_name || "",
        x: 900,
        y: 770,
        font: `italic 33px ${fontFamily}`,
        color: "#ffffff",
        align: "right",
        maxWidth: 500,
        lineHeight: 30,
      },
      {
        text: formData.doctorDetails.clinic_address || "",
        x: 900,
        y: 810,
        font: `29px ${fontFamily}`,
        color: "#ffffff",
        align: "right",
        maxWidth: 520,
        lineHeight: 30,
      },
      {
        text: formData.doctorDetails.contact_no || "",
        x: 170,
        y: 1025,
        font: `22px ${fontFamily}`,
        color: "#06403f",
        align: "left",
        maxWidth: 300,
        lineHeight: 24,
      },
      {
        text: formData.doctorDetails.email || "",
        x: 170,
        y: 1070,
        font: `22px ${fontFamily}`,
        color: "#06403f",
        align: "left",
        maxWidth: 300,
        lineHeight: 24,
      },
      
    ];

    textElements.forEach(
      ({ text, x, y, font, color, align, maxWidth, lineHeight }) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;

        const lines = [];
        const words = text.split(" ");
        let currentLine = "";

        words.forEach((word) => {
          const testLine = currentLine + word + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine !== "") {
            lines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine.trim() !== "") lines.push(currentLine.trim());

        lines.forEach((line, index) => {
          ctx.fillText(line, x, y + index * lineHeight);
        });
      }
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return reject("Failed to generate blob.");
        const fileName = `${slugify(formData.doctorDetails.name)}-eCard.png`;
        const fileUrl = await UploadFile(blob, fileName, "image");
        resolve(fileUrl);
      }, "image/png");
    });
  } catch (error) {
    console.error("Error generating E-Card:", error);
    return null;
  }
};

const loadImageWithProxy = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl, { mode: "cors" });
    if (!response.ok) throw new Error("Failed to fetch image.");
    const blob = await response.blob();
    return URL.createObjectURL(blob); // Convert to Object URL
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
};
