"""ContentBuild Processor - 构建 Gutenberg 块格式的文章内容"""

import logging

from app.core.context import GameContext

logger = logging.getLogger(__name__)


class ContentBuildProcessor:
    async def process(self, ctx: GameContext) -> GameContext:
        steam = ctx.steam_data
        name = steam.get("name", "")
        blocks = []

        # ---- 游戏截图（放在最前面） ----
        screenshots = steam.get("screenshots", [])
        if screenshots:
            blocks.append(self._heading("游戏截图", level=2))
            gallery_items = []
            for ss in screenshots[:10]:  # 最多10张
                url = ss.get("path_full", "")
                if url:
                    gallery_items.append(self._image(url, alt=f"{name} 截图"))
            if gallery_items:
                blocks.append(self._gallery(gallery_items))

        # ---- 游戏介绍 ----
        blocks.append(self._heading("游戏介绍", level=2))
        content = ctx.rewritten_content or steam.get("short_description", "")
        for para in content.split("\n\n"):
            para = para.strip()
            if para:
                blocks.append(self._paragraph(para))

        ctx.block_content = "\n\n".join(blocks)
        logger.info(f"[ContentBuild] 生成 {len(blocks)} 个 Gutenberg 块")
        return ctx

    def supports(self, ctx: GameContext) -> bool:
        return bool(ctx.steam_data) and ctx.block_content is None

    # ---- Gutenberg 块生成器 ----

    def _heading(self, text: str, level: int = 2) -> str:
        tag = f"h{level}"
        return (
            f'<!-- wp:heading {{"level":{level}}} -->\n'
            f'<{tag} class="wp-block-heading">{text}</{tag}>\n'
            f"<!-- /wp:heading -->"
        )

    def _paragraph(self, text: str) -> str:
        return (
            f"<!-- wp:paragraph -->\n"
            f"<p>{text}</p>\n"
            f"<!-- /wp:paragraph -->"
        )

    def _image(self, url: str, alt: str = "", css_class: str = "") -> str:
        class_attr = f' class="{css_class}"' if css_class else ""
        attrs = f'{{"sizeSlug":"large"}}'
        if css_class:
            attrs = f'{{"sizeSlug":"large","className":"{css_class}"}}'
        return (
            f"<!-- wp:image {attrs} -->\n"
            f'<figure class="wp-block-image size-large{" " + css_class if css_class else ""}">'
            f'<img src="{url}" alt="{alt}"/>'
            f"</figure>\n"
            f"<!-- /wp:image -->"
        )

    def _gallery(self, image_blocks: list[str], columns: int = 3) -> str:
        inner = "\n".join(image_blocks)
        return (
            f'<!-- wp:gallery {{"columns":{columns},"linkTo":"file"}} -->\n'
            f'<figure class="wp-block-gallery has-nested-images columns-{columns} is-cropped">\n'
            f"{inner}\n"
            f"</figure>\n"
            f"<!-- /wp:gallery -->"
        )
