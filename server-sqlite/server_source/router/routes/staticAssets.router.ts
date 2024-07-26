import express = require('express');
import { EnvManager } from '../../env.js';

const router = express.Router();

router.get("/assets/*", (req, res) => { res.sendFile(req.path, { root: EnvManager.distFolderLocation }); });
router.get("/*", (req, res) => { res.sendFile("index.html", { root: EnvManager.distFolderLocation }); });

export default router;