import { Relation } from "typeorm";
import { User } from "./entities/user.entity.js";

export interface OwnedEntity
{
    ownerId: string;
    owner: Relation<User> | null;
}