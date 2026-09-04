import axios from "axios"
// import unzipper from "unzipper"
export const unzipFile = async (owner:string, repo:string): Promise<void> => {
    const url = `https://api.github.com/repos/${owner}/${repo}/zipball/main`;
    const response = await axios.get(url, {
        responseType: "arraybuffer"
    });
    console.log(response.data)
}

export default unzipFile 