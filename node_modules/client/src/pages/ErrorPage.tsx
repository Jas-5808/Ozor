import { NavLink } from "react-router-dom";
import cn from "./style.module.scss";
export function ErrorPage(){
    return(
        <>
            <div className={cn.errorPage}>
                <div className={cn.errorPage_content}>
                    <h2>404</h2>
                    <p>dfg</p>
                    <NavLink to="/">dfg</NavLink>
                </div>
            </div>
        </>
    )
}