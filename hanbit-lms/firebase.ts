import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Firebase 콘솔에서 복사한 설정값을 아래에 붙여넣으세요.
// https://console.firebase.google.com/
// 설정 -> 일반 -> 내 앱 -> SDK 설정 및 구성
const firebaseConfig = {
  apiKey: "API_KEY_를_여기에_붙여넣으세요",
  authDomain: "project-id.firebaseapp.com",
  databaseURL: "https://project-id-default-rtdb.firebaseio.com",
  projectId: "project-id",
  storageBucket: "project-id.appspot.com",
  messagingSenderId: "sender-id",
  appId: "app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);