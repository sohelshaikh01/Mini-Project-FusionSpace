import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_KEY,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath) => {
    try {
        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log("File has uploaded on cloudinary", response.url);

        fs.unlinkSync(localFilePath);
        return response;
    }
    catch(error) {

        try {
            if(fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        }
        catch (fsError) {
            console.error("Failed to delete local file:", fsError);
        }

        return null;
    }

}

const removeFromCloudinary = async(cloudFileUrl) => {

    try {
        if(!cloudFileUrl) return null;

        const response = await cloudinary.uploader.destory(cloudFileUrl);

        if(!response) {
            console.log("Failed to delete file in cloudinary");
            return null;
        }

        console.log("Successfully deleted file in cloudinary");

    } catch(error) {{
        console.log("Error while deleted file in cloudinary:", error);
    }}
}

export {
    uploadOnCloudinary,
    removeFromCloudinary
}