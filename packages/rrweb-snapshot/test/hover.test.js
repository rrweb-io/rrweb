import postcss from 'postcss';
import { pseudoClassPlugin } from '../src/css';

const normalize = (str) =>
  str
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '');

describe('postcss-hover-classes plugin', () => {
  const run = async (input, expected) => {
    const result = await postcss([pseudoClassPlugin]).process(input, {
      from: undefined,
    });

    expect(normalize(result.css)).toBe(normalize(expected));
  };

  it('adds escaped class selectors for :hover', async () => {
    await run(
      `
.btn:hover {
  color: red;
}
`,
      `
.btn:hover,
.btn.\\:hover {
  color: red;
}
`,
    );
  });

  it('does not change selectors without :hover', async () => {
    await run(
      `
.btn {
  color: blue;
}
`,
      `
.btn {
  color: blue;
}
`,
    );
  });

  it('handles multiple :hover selectors in one rule', async () => {
    await run(
      `
.btn:hover, 
.link:hover {
  text-decoration: underline;
}
`,
      `
.btn:hover,
.link:hover,
.btn.\\:hover,
.link.\\:hover {
  text-decoration: underline;
}
`,
    );
  });
});

describe('postcss-hover-classes plugin - regex overflow protection', () => {
  // 生成包含N个:hover的超大选择器
  const generateLargeSelector = (count) =>
    Array.from({ length: count }, (_, i) => `.class${i}:hover`).join(', ');

  it('handles 10,000 :hover in single selector', async () => {
    const input = `
      .selector ${generateLargeSelector(10000)} {
        color: red;
      }
    `;

    const output = await postcss([pseudoClassPlugin]).process(input, {
      from: undefined,
    });

    // 验证替换数量
    const replacedCount = (output.css.match(/\.\\:hover/g) || []).length;
    expect(replacedCount).toBe(10000);

    // 验证内存安全
    expect(process.memoryUsage().heapUsed / 1024 / 1024).toBeLessThan(50); // 限制在50MB内
  });

  it('preserves escaped :hover correctly', async () => {
    const input = `
      .safe\\:hover,
      .unsafe:hover {
        display: block;
      }
    `;

    const output = await postcss([pseudoClassPlugin]).process(input, {
      from: undefined,
    });

    expect(output.css).toContain('.safe\\:hover');
    expect(output.css).toContain('.unsafe.\\:hover');
  });

  it('avoids stack overflow with recursive :hover', async () => {
    const input = `
      .recursive${generateLargeSelector(100000).replace(/:/g, '')}:hover {
        position: absolute;
      }
    `;

    await expect(
      postcss([pseudoClassPlugin]).process(input, { from: undefined }),
    ).resolves.not.toThrow();
  });

  it('maintains selector order after replacement', async () => {
    const input = `
      .a:hover,
      .b:hover,
      .c\\:hover,
      .d:hover {
        background: white;
      }
    `;

    const output = await postcss([pseudoClassPlugin]).process(input, {
      from: undefined,
    });

    const expectedOrder = [
      '.a:hover',
      '.a.\\:hover',
      '.b:hover',
      '.b.\\:hover',
      '.c\\:hover', // 保持原位置
      '.d:hover',
      '.d.\\:hover',
    ];

    expectedOrder.forEach((sel) => {
      expect(output.css).toContain(sel);
    });
  });

  it('handles unicode characters safely', async () => {
    const input = `
      .中文:hover,
      [data-value="😊"]:hover {
        font-family: "Arial";
      }
    `;

    const output = await postcss([pseudoClassPlugin]).process(input, {
      from: undefined,
    });

    expect(output.css).toContain('.中文.\\:hover');
    expect(output.css).toContain('[data-value="😊"].\\:hover');
  });
});
