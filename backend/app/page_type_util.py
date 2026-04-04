"""根据路径推断前台页面类型（用于分析报表）。"""


def infer_page_type(path: str) -> str:
    p = path.split("?", 1)[0].rstrip("/") or "/"
    if p == "/":
        return "Home"
    if p.startswith("/tool/"):
        return "Tool Detail"
    if p.startswith("/category/"):
        return "Category"
    if p.startswith("/submit"):
        return "Submit"
    if p.startswith("/compare/"):
        return "Compare"
    if p == "/compare":
        return "Compare"
    if p.startswith("/dashboard"):
        return "Dashboard"
    if p.startswith("/profile") or p.startswith("/edit-profile"):
        return "Profile"
    if p.startswith("/favorites") or p.startswith("/settings"):
        return "Account"
    if p.startswith("/guide") or p.startswith("/more") or p.startswith("/sitemap"):
        return "Content"
    return "Other"
