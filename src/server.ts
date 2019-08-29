import axios from 'axios';

import * as vscode from 'vscode';
let axiosInstance = axios.create();

export default function server(context: vscode.ExtensionContext) {
  axiosInstance.interceptors.request.use(requestObj => {
    // let token = cookies.get('token');
    let token = context.workspaceState.get('token');
    if (token !== null) {
      requestObj.headers.Authorization = `bearer ${token}`;
    }
    return requestObj;
  });
  return function({ url, method, data }) {
    return axiosInstance({
      url: 'http://localhost:3000/' + url,
      method: method || 'POST',
      data: data || {}
    });
  };
}
