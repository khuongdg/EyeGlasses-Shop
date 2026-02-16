import axiosClient from "../api/axiosClient";

export const getDashboardStats = (params) => {
    return axiosClient.get("/dashboard/stats", { params });
}
