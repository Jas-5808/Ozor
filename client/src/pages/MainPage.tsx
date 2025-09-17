import React from "react";
import cn from "./style.module.scss";
import ProductsList from "../components/ProductsList";
import SimpleSlider from "../components/SimpleSlider";
export function MainPage(){
  return (
    <>
        <div className={cn.main}>
          <div className="container">
            <div className={cn.main_content}>
              <SimpleSlider />
              <div className={cn.cards}>
                <ProductsList />
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
export default MainPage;
