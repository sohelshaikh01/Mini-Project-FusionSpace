import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
});

connectDB()
.then(() => {
    app.on('error', (error) => {
        console.log("Error", error);
    });

    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port 8000`);
    });
})
.catch((error) => {
    console.log("Mongo DB connection failed !!!", error);
});

