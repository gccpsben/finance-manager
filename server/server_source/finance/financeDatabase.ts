import { prop, getModelForClass, modelOptions, ReturnModelType } from "@typegoose/typegoose"
import * as typegoose from "@typegoose/typegoose";
import * as mongo from "mongodb";
import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from 'uuid';
import mongoose, { Model, Mongoose, ObjectId, PromiseProvider } from "mongoose";
import { Types } from "../database";
import { logGreen, logRed, log, logBlue, getLog, logYellow } from "../extendedLog";
import axios from "axios";
import { genUUID } from "../uuid";
import { DataCache } from "./dataCache";