export interface SamplePortfolioItem {
  id: string;
  name: string;
  mimeType: string;
  description: string;
  expectedVerdict: "approved" | "needs_review" | "rejected";
  expectedReason: string;
  dataUrl: string;
}

function createDataUrl(
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  draw(ctx, 640, 480);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export function getSamplePortfolioImages(): SamplePortfolioItem[] {
  // 1. Genuine Electrician Job: Distribution board with circuit breakers and organized copper cabling
  const realElectrical = createDataUrl((ctx, w, h) => {
    // Gray concrete wall background with real job site dust
    ctx.fillStyle = "#4a4d52";
    ctx.fillRect(0, 0, w, h);

    // Distribution enclosure box
    ctx.fillStyle = "#8d939e";
    ctx.fillRect(100, 60, 440, 360);
    ctx.strokeStyle = "#2b2e34";
    ctx.lineWidth = 6;
    ctx.strokeRect(100, 60, 440, 360);

    // Din rails
    ctx.fillStyle = "#bdc3c7";
    ctx.fillRect(140, 130, 360, 24);
    ctx.fillRect(140, 250, 360, 24);

    // Miniature Circuit Breakers (MCBs)
    const mcbColors = ["#ecf0f1", "#ecf0f1", "#34495e", "#ecf0f1", "#ecf0f1"];
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = mcbColors[i % mcbColors.length];
      ctx.fillRect(160 + i * 36, 105, 30, 75);
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 2;
      ctx.strokeRect(160 + i * 36, 105, 30, 75);

      // Toggle switch
      ctx.fillStyle = i === 2 ? "#e74c3c" : "#27ae60";
      ctx.fillRect(168 + i * 36, 135, 14, 16);
    }

    // Lower row breakers
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = "#ecf0f1";
      ctx.fillRect(160 + i * 36, 225, 30, 75);
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 2;
      ctx.strokeRect(160 + i * 36, 225, 30, 75);
      ctx.fillStyle = "#27ae60";
      ctx.fillRect(168 + i * 36, 255, 14, 16);
    }

    // Colorful Wiring bundles (red, yellow, blue, green earth wires)
    const wireColors = ["#e74c3c", "#f1c40f", "#2980b9", "#27ae60"];
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = wireColors[i % wireColors.length];
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(120 + (i * 20), 40);
      ctx.bezierCurveTo(
        130 + i * 15,
        180,
        150 + i * 10,
        280,
        170 + (i % 8) * 36,
        300
      );
      ctx.stroke();
    }

    // Worksite label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("Main DB - Phase 3 Installation (Finished Job)", 120, 400);
  });

  // 2. Genuine Plumbing Job: PVC drain pipe and brass ball valve under kitchen sink
  const realPlumbing = createDataUrl((ctx, w, h) => {
    // Under-sink cabinet wood texture
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(20, 20, w - 40, h - 40);

    // PVC P-Trap and drainage piping
    ctx.strokeStyle = "#eceff1";
    ctx.lineWidth = 38;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Vertical inlet from sink
    ctx.beginPath();
    ctx.moveTo(240, 30);
    ctx.lineTo(240, 180);
    // U-bend curve
    ctx.quadraticCurveTo(240, 290, 320, 290);
    ctx.quadraticCurveTo(390, 290, 390, 210);
    // Wall outflow
    ctx.lineTo(580, 210);
    ctx.stroke();

    // Pipe joints / couplers
    ctx.fillStyle = "#cfd8dc";
    ctx.fillRect(215, 120, 50, 20);
    ctx.fillRect(365, 200, 50, 22);

    // Hot & Cold copper water inlet lines with red/blue valves
    ctx.strokeStyle = "#b87333";
    ctx.lineWidth = 14;
    // Cold line
    ctx.beginPath();
    ctx.moveTo(140, 440);
    ctx.lineTo(140, 150);
    ctx.lineTo(180, 110);
    ctx.stroke();
    // Hot line
    ctx.beginPath();
    ctx.moveTo(100, 440);
    ctx.lineTo(100, 170);
    ctx.lineTo(130, 120);
    ctx.stroke();

    // Ball valve handles
    ctx.fillStyle = "#e53935"; // Red hot valve
    ctx.fillRect(80, 230, 38, 14);
    ctx.fillStyle = "#1e88e5"; // Blue cold valve
    ctx.fillRect(120, 220, 38, 14);

    // Tools sitting in cabinet (wrench)
    ctx.fillStyle = "#78909c";
    ctx.save();
    ctx.translate(460, 370);
    ctx.rotate(0.5);
    ctx.fillRect(-15, -60, 30, 120);
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("Kitchen Sink P-Trap & Dual Angle Valves Repaired", 110, 450);
  });

  // 3. Stock Photo with Watermark: Commercial catalog power tool render
  const stockPhoto = createDataUrl((ctx, w, h) => {
    // Clean studio white gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#e0e6ed");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Studio shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.beginPath();
    ctx.ellipse(320, 380, 220, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Commercial studio render of an electric cordless drill
    ctx.fillStyle = "#f39c12";
    ctx.fillRect(240, 160, 170, 75);
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(290, 230, 60, 140);
    ctx.fillRect(260, 360, 120, 35);
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(170, 175, 70, 45);
    ctx.fillStyle = "#34495e";
    ctx.fillRect(140, 190, 30, 15);

    // Heavy stock watermarks repeating across the image
    ctx.fillStyle = "rgba(120, 130, 145, 0.45)";
    ctx.font = "bold 34px sans-serif";
    ctx.save();
    ctx.rotate(-0.35);
    ctx.fillText("SHUTTERSTOCK  •  STOCK PHOTO  •  WATERMARK", -60, 220);
    ctx.fillText("GETTY IMAGES  •  PREVIEW ONLY  •  ISTOCK", -40, 340);
    ctx.fillText("DO NOT REPRODUCE  •  STOCK ASSET", -20, 460);
    ctx.restore();

    ctx.fillStyle = "#7f8c8d";
    ctx.font = "italic 13px sans-serif";
    ctx.fillText("Commercial stock catalog render ID: 94827184", 20, 465);
  });

  // 4. Blurry & Pitch Dark Photo: Low quality flashlight shot of floor
  const blurryDark = createDataUrl((ctx, w, h) => {
    // Pitch black background
    ctx.fillStyle = "#0c0d0f";
    ctx.fillRect(0, 0, w, h);

    // Faint blurry dim yellowish light circle
    const rad = ctx.createRadialGradient(280, 230, 20, 280, 230, 180);
    rad.addColorStop(0, "rgba(80, 70, 45, 0.35)");
    rad.addColorStop(0.5, "rgba(35, 30, 20, 0.2)");
    rad.addColorStop(1, "rgba(10, 10, 10, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);

    // Intensely blurry smear
    ctx.strokeStyle = "rgba(45, 45, 45, 0.4)";
    ctx.lineWidth = 45;
    ctx.beginPath();
    ctx.moveTo(150, 210);
    ctx.lineTo(400, 250);
    ctx.stroke();

    ctx.fillStyle = "rgba(180, 180, 180, 0.4)";
    ctx.font = "14px sans-serif";
    ctx.fillText("[Image too dark and blurry to verify trade work]", 160, 450);
  });

  // 5. Irrelevant WhatsApp Meme / Social Forward: Unrelated funny cat graphic
  const memeGraphic = createDataUrl((ctx, w, h) => {
    // Bright neon cartoon meme background
    ctx.fillStyle = "#8e44ad";
    ctx.fillRect(0, 0, w, h);

    // Top meme banner
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px impact, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WHEN THE CLIENT ASKS FOR A DISCOUNT", w / 2, 60);

    // Cartoon face graphic
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(w / 2, 220, 100, 0, Math.PI * 2);
    ctx.fill();

    // Funny sunglasses
    ctx.fillStyle = "#000000";
    ctx.fillRect(w / 2 - 80, 190, 65, 35);
    ctx.fillRect(w / 2 + 15, 190, 65, 35);
    ctx.fillRect(w / 2 - 20, 200, 40, 8);

    // Smirk mouth
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(w / 2, 250, 40, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Bottom meme banner
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px impact, sans-serif";
    ctx.fillText("AND SAYS 'IT IS ONLY A 5 MINUTE JOB'", w / 2, 420);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "12px sans-serif";
    ctx.fillText("WhatsApp Forward / Meme Graphic", w / 2, 455);
  });

  return [
    {
      id: "sample-1",
      name: "distribution_board_wiring.jpg",
      mimeType: "image/jpeg",
      description: "Real photo of home electrical distribution board with clean phase cabling",
      expectedVerdict: "approved",
      expectedReason: "Authentic electrical trade work, clearly documented.",
      dataUrl: realElectrical,
    },
    {
      id: "sample-2",
      name: "sink_ptrap_plumbing_fix.jpg",
      mimeType: "image/jpeg",
      description: "Real photo of PVC drain P-trap and dual inlet shutoff valves under sink",
      expectedVerdict: "approved",
      expectedReason: "Authentic plumbing job with visible trade tools.",
      dataUrl: realPlumbing,
    },
    {
      id: "sample-3",
      name: "stock_shutterstock_cordless_drill.jpg",
      mimeType: "image/jpeg",
      description: "Commercial stock catalog photo with visible Shutterstock watermark",
      expectedVerdict: "rejected",
      expectedReason: "Flagged as stock photo with watermarks, not authentic job proof.",
      dataUrl: stockPhoto,
    },
    {
      id: "sample-4",
      name: "dark_blurry_basement_snap.jpg",
      mimeType: "image/jpeg",
      description: "Severely underexposed, blurry flashlight photo with unidentifiable work",
      expectedVerdict: "needs_review",
      expectedReason: "Image quality issue — too dark and blurry to verify workmanship.",
      dataUrl: blurryDark,
    },
    {
      id: "sample-5",
      name: "whatsapp_discount_meme.jpg",
      mimeType: "image/jpeg",
      description: "Unrelated WhatsApp cartoon meme graphic, not trade documentation",
      expectedVerdict: "needs_review",
      expectedReason: "Duplicate style meme / social graphic; does not depict trade work.",
      dataUrl: memeGraphic,
    },
  ];
}
