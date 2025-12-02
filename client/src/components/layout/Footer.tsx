import { useTranslation } from "react-i18next";

export function Footer(){
    const { t } = useTranslation();
    const year = new Date().getFullYear();
    return(
        <>
            <footer className="bg-gray-100 py-8">
                <div className="container">
                    <div className="flex justify-between items-center">
                        <div className="text-2xl font-bold text-gray-800">{t("common.appName")}</div>
                        <p className="text-gray-600">© {year} {t("footer.rights")}</p>
                    </div>
                </div>
            </footer>
        </>
    )
}
export default Footer;