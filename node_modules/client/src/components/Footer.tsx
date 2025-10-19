import cn from "./mainCss.module.scss";
export function Footer(){
    return(
        <>
            <footer className={cn.footer}>
                <div className="container">
                    <div className={cn.footer_content}>
                        <div className={cn.logo}>Uzbmarket</div>
                        <p>© 2025 All rights reserved</p>
                    </div>
                </div>
            </footer>
        </>
    )
}
export default Footer;