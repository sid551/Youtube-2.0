import video from "../Modals/video.js";
import { createUploadNotification } from "./notification.js";

const SAMPLE_VIDEOS = [
  {
    videotitle: "Big Buck Bunny - Official 4K Trailer",
    filename: "big_buck_bunny.mp4",
    filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    filetype: "video/mp4",
    filesize: "15800000",
    videochanel: "Blender Foundation",
    uploader: "official_blender",
    views: 124500,
    Like: 3420,
  },
  {
    videotitle: "Elephant's Dream - Open Source Cinema",
    filename: "elephants_dream.mp4",
    filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    filetype: "video/mp4",
    filesize: "24500000",
    videochanel: "Open Cinema",
    uploader: "open_cinema",
    views: 89300,
    Like: 2150,
  },
  {
    videotitle: "For Bigger Blazes - Tech & Innovation Showcase",
    filename: "for_bigger_blazes.mp4",
    filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    filetype: "video/mp4",
    filesize: "18900000",
    videochanel: "Tech World",
    uploader: "tech_world",
    views: 65400,
    Like: 1890,
  },
  {
    videotitle: "For Bigger Escapes - Travel & Nature 4K",
    filename: "for_bigger_escape.mp4",
    filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    filetype: "video/mp4",
    filesize: "21000000",
    videochanel: "Wanderlust Nature",
    uploader: "wanderlust_channel",
    views: 94200,
    Like: 2780,
  },
  {
    videotitle: "Sintel - Animated Fantasy Short Film",
    filename: "sintel.mp4",
    filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    filetype: "video/mp4",
    filesize: "31200000",
    videochanel: "Durian Open Movie Project",
    uploader: "durian_project",
    views: 156300,
    Like: 4590,
  },
  {
    videotitle: "Tears of Steel - Sci-Fi VFX Short",
    filename: "tears_of_steel.mp4",
    filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    filetype: "video/mp4",
    filesize: "28400000",
    videochanel: "Mango Open Movie Project",
    uploader: "mango_project",
    views: 112000,
    Like: 3120,
  },
];

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  }
  try {
    const normalizedFilePath = req.file.path.replace(/\\/g, "/");

    const file = new video({
      videotitle: req.body.videotitle,
      filename: req.file.originalname,
      filepath: normalizedFilePath,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      uploader: req.body.uploader,
    });
    await file.save();
    // Fan-out upload notification to all other users (non-blocking)
    createUploadNotification(req.body.uploader, file._id, req.body.videotitle);
    return res.status(201).json("file uploaded successfully");
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallvideo = async (req, res) => {
  try {
    let files = await video.find();

    // Auto-seed sample videos into MongoDB if collection is empty
    if (!files || files.length === 0) {
      files = await video.insertMany(SAMPLE_VIDEOS);
      console.log(`[Database] Auto-seeded ${files.length} sample videos into MongoDB.`);
    }

    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
