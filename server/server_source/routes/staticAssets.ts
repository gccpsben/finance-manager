import express = require('express');
import { distFolderLocation } from '../server';

const router = express.Router();

// router.use("/", express.static(distFolderLocation));
router.use("/assets/*", (req, res) => { res.sendFile(req.path, { root: distFolderLocation }); });
router.use("/*", (req, res) => { res.sendFile("index.html", { root: distFolderLocation }); });

export default router;