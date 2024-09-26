import express = require('express');
import { distFolderLocation } from '../server';

const router = express.Router();

router.get("/manifest.webmanifest", (req, res) => { res.sendFile(`manifest.json`, { root: distFolderLocation }); });
router.get("/manifest.json", (req, res) => { res.sendFile(`manifest.json`, { root: distFolderLocation }); });
router.get("/assets/*", (req, res) => { res.sendFile(req.path, { root: distFolderLocation }); });
router.get("/*", (req, res) => { res.sendFile("index.html", { root: distFolderLocation }); });

export default router;