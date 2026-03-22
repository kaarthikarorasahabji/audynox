import Axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:7860';

const backendAxios = Axios.create({
  baseURL: BACKEND_URL,
  headers: {},
});

export default backendAxios;
