import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { authAPI } from "../services/api";
export function TestAuth() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("+998943333395");
  const [password, setPassword] = useState("1234");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const handleTestSignin = async () => {
    setLoading(true);
    setResult("");
    try {
      console.log("Testing sign-in with:", { phone, password });
      const response = await authAPI.signin(phone, password);
      setResult(t("authPage.success", { data: JSON.stringify(response.data, null, 2) }));
    } catch (error: any) {
      console.error("Sign-in failed:", error);
      setResult(
        t("authPage.failure", {
          message: error?.message,
          details: JSON.stringify(error?.response?.data ?? error, null, 2),
        })
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h2>{t("authPage.title")}</h2>
      <p>{t("authPage.subtitle")}</p>
      <div style={{ marginBottom: "10px" }}>
        <label>{t("authPage.placeholder.phone")}:</label>
        <input 
          type="text" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: "5px" }}
        />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label>{t("authPage.placeholder.password")}:</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: "5px" }}
        />
      </div>
      <button 
        onClick={handleTestSignin} 
        disabled={loading}
        style={{ 
          padding: "10px 20px", 
          backgroundColor: "#007bff", 
          color: "white", 
          border: "none", 
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? t("authPage.submitting") : t("authPage.submit")}
      </button>
      {result && (
        <div style={{ 
          marginTop: "20px", 
          padding: "10px", 
          backgroundColor: "#f8f9fa", 
          border: "1px solid #dee2e6",
          borderRadius: "4px",
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          fontSize: "12px"
        }}>
          {result}
        </div>
      )}
    </div>
  );
}
export default TestAuth;
