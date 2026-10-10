
const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const Analysis = require("../models/Analysis");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get all resumes belonging to the user
    const resumes = await Resume.find({ userId }).lean();

    const resumeIds = resumes.map((r) => r._id);

    const resumeMap = new Map(
      resumes.map((r) => [r._id.toString(), r])
    );

    // Get all versions for these resumes
    const versions = await ResumeVersion.find({
      resumeId: { $in: resumeIds },
    })
      .select(
        "_id resumeId label versionNumber sourceType createdAt latestAnalysisId parentVersionId"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Collect analysis IDs from the versions
    const analysisIds = versions
      .map((v) => v.latestAnalysisId)
      .filter(Boolean);

    // Get analyses if analysis IDs exist
    const analyses = analysisIds.length
      ? await Analysis.find({
          _id: { $in: analysisIds },
        })
          .select("_id atsScore versionId")
          .lean()
      : [];

    // Map each version ID to its ATS score
    const scoreByVersion = new Map(
      analyses.map((a) => [
        a.versionId?.toString(),
        a.atsScore,
      ])
    );

    // Prepare version history items
    const items = versions.map((v) => {
      const resume = resumeMap.get(
        v.resumeId.toString()
      );

      return {
        id: v._id,
        label: v.label,
        versionNumber: v.versionNumber,
        sourceType: v.sourceType,
        createdAt: v.createdAt,
        score:
          scoreByVersion.get(v._id.toString()) ?? null,
        resumeId: v.resumeId,
        resumeTitle: resume?.title || "Resume",
        parentVersionId: v.parentVersionId,
      };
    });

    // Calculate version totals
    const totals = {
      all: items.length,
      uploads: items.filter(
        (i) => i.sourceType === "upload"
      ).length,
      rewrites: items.filter(
        (i) => i.sourceType === "rewrite"
      ).length,
    };

    // Send the response
    res.json({
      versions: items,
      totals,
    });
  })
);

module.exports = router;