import axiosClient from "../api/axiosClient";

export const getAllImports = (params) => {
  return axiosClient.get("/imports", { params });
}

export const getImportById = (id) => {
  return axiosClient.get(`/imports/${id}`);
}

export const createImport = (data) => {
  return axiosClient.post("/imports/create", data);
}

export const cancelImport = (importId) => {
  return axiosClient.delete(`/imports/${importId}/cancel`);
}