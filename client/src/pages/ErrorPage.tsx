import { Link, useRouteError } from "react-router-dom";
import cn from "./style.module.scss";

export function ErrorPage() {
	const error = useRouteError() as any;
	const status = (error && (error.status || error.statusCode)) || 404;
	const message =
		status === 404
			? "К сожалению, такой страницы не существует или она была перемещена."
			: (error?.statusText || error?.message || "Произошла ошибка");

	return (
		<div className={cn.not_found_screen}>
			<div className={cn.not_found_container}>
				<div className={cn.not_found_icon}>🧭</div>
				<h2 className={cn.not_found_title}>Страница не найдена</h2>
				<p className={cn.not_found_message}>{message}</p>
				<div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
					<button className={cn.back_button} onClick={() => window.history.back()}>
						Назад
					</button>
					<Link to="/" className={cn.back_button}>
						На главную
					</Link>
				</div>
			</div>
		</div>
	);
}