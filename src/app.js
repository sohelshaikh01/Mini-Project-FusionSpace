import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const corsOptions = {
    origin: "http://localhost:5173", 
    
    // Allow credentials (cookies)
    credentials: true, 
    
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

app.use(express.json({limit: "16kb"}));

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}));

app.use(express.static("public"))
app.use(cookieParser());


import healthcheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";
import postRouter from "./routes/post.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import discoveryRouter from "./routes/discovery.routes.js";

import followRouter from "./routes/follows.routes.js";
import communityRouter from "./routes/community.routes.js";
import communityMemberRouter from "./routes/community_members.routes.js"


app.use('/api/v1/healthcheck', healthcheckRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/likes', likeRouter);
app.use('/api/v1/discovery', discoveryRouter);

app.use('/api/v1/follows', followRouter);
app.use('/api/v1/community', communityRouter);
app.use('/api/v1/community-members', communityMemberRouter);

export { app };