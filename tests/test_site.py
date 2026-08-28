from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


class LandingPageTest(unittest.TestCase):
    def test_required_pages_and_assets_exist(self):
        for relative in (
            "index.html",
            "admin.html",
            "admin.css",
            "admin.js",
            "styles.css",
            "app.js",
            "config.js",
            "terms.html",
            "refund.html",
            "assets/hero-arrival.png",
            "assets/founder-welcome.png",
        ):
            self.assertTrue((PUBLIC / relative).is_file(), relative)

    def test_pdf_sections_and_aws_assets_are_present(self):
        html = (PUBLIC / "index.html").read_text(encoding="utf-8")
        for marker in ("#pricing", "id=\"services\"", "id=\"process\"", "id=\"partner\"", "R$ 3.980", "R$ 2.980", "@hng_agency", "823-32-01422", "전자상거래 소매 중개업", "Código de indicação"):
            self.assertIn(marker, html)
        self.assertTrue((ROOT / "aws" / "template.yaml").is_file())
        self.assertTrue((ROOT / "aws" / "deploy.ps1").is_file())

    def test_admin_dashboard_uses_adminlte(self):
        html = (PUBLIC / "admin.html").read_text(encoding="utf-8")
        for marker in ("AdminLTE 4.8.5", "Pedidos & pagamentos", "Códigos de parceiro", "Produtos: turismo & estudantes estrangeiros"):
            self.assertIn(marker, html)


if __name__ == "__main__":
    unittest.main()
