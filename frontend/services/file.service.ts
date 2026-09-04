import axios from "axios";

async function getGithubRepository(url: string) {
  try {
    const response = await axios.post(
      "http://localhost:5000/getrepository",
      {
        repourl:url,
      }
    );
    console.log(response.data.data);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export default getGithubRepository;

