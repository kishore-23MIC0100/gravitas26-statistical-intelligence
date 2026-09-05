import { describe, it, expect } from "vitest";
import { analyze, detectMapping } from "../lib/analytics";
import fs from "fs";
import path from "path";

describe("Analytics & Data Engine", () => {
  it("detects standard headers automatically", () => {
    const cols = ["Participant Type", "College Name", "Event Name", "Payment Status", "Gender"];
    const mapping = detectMapping(cols);
    expect(mapping.type).toBe("Participant Type");
    expect(mapping.college).toBe("College Name");
    expect(mapping.event).toBe("Event Name");
    expect(mapping.payment).toBe("Payment Status");
    expect(mapping.gender).toBe("Gender");
  });

  it("calculates report metrics from sample data accurately", () => {
    const rows = [
      { type: "internal", college: "VIT", event: "Hackathon", payment: "paid", gender: "Male" },
      { type: "external", college: "IIT Madras", event: "RoboWars", payment: "paid", gender: "Female" },
      { type: "external", college: "NIT Trichy", event: "Hackathon", payment: "pending", gender: "Female" },
    ];
    const report = analyze(rows, ["type", "college", "event", "payment", "gender"]);
    expect(report.rows).toBe(3);
    expect(report.internal.value).toBe(1);
    expect(report.external.value).toBe(2);
    expect(report.paid.value).toBe(2);
    expect(report.categories.status).toBe("unavailable");
  });
});

describe("Official Team Portraits & Assets Verification", () => {
  const expectedImages = [
    "chancellor.webp",
    "sankar.webp",
    "sekar.webp",
    "selvam.webp",
    "cp1.webp",
    "cp2.webp",
    "cp6.png",
    "cp3.webp",
    "cp4.webp",
    "cp5.webp",
    "sudhakar1.png",
    "joel.png",
    "pradheep.png",
    "priti.png",
    "praveen.png",
    "manga.webp",
  ];

  it("ensures all 16 official portraits exist locally and are non-empty", () => {
    const publicTeamDir = path.resolve(__dirname, "../public/team");
    expect(fs.existsSync(publicTeamDir)).toBe(true);

    for (const imgName of expectedImages) {
      const fullPath = path.join(publicTeamDir, imgName);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stats = fs.statSync(fullPath);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });

  it("ensures official SVG branding assets exist", () => {
    const assetsDir = path.resolve(__dirname, "../public/assets");
    expect(fs.existsSync(assetsDir)).toBe(true);

    const brandingSvgs = ["vitLogo.0968a7ac.svg", "gravitasLogo.dc8211c7.svg"];
    for (const svg of brandingSvgs) {
      const fullPath = path.join(assetsDir, svg);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(100);
    }
  });
});
