import type { Request, Response } from "express";
import axios from "axios";

const getrepository = async (req: Request, res: Response) => {
try {
const { repourl } = req.body;

console.log("Received repository URL:", repourl);
const name = repourl.split("/")[4]
const repo = repourl.split("/")[5]
const apiUrl = `https://api.github.com/repos/${name}/${repo}`; 
const response = await axios.get(apiUrl); 
return res.status(200).json({ 
  message: "Repository data fetched successfully", 
  data: response.data, 
}) 

} catch (error) {
console.error(error);

res.status(500).json({ 
  message: "Something went wrong", 
}); 

}
};

export default {getrepository}