# NeroNote

Caderno digital simples para organizar anotações por matéria.

## Como usar

1. Abra `index.html` no navegador.
2. Clique em `+` para criar um caderno.
3. Escolha o nome da matéria.
4. Escreva em Markdown — o resultado aparece ao vivo à direita.
5. O conteúdo é salvo automaticamente no `localStorage`.

## Funções

- Criar caderno
- Abrir caderno
- Escrever em **Markdown** com preview ao vivo (editor dividido)
- Inserir e renderizar **fórmulas matemáticas** com KaTeX
- Salvar automaticamente
- Renomear caderno
- Excluir caderno com confirmação
- Contador de palavras

## Sem backend

Os dados ficam salvos apenas no navegador/computador onde o projeto está sendo usado.

Tecnologias:
- HTML
- CSS
- JavaScript


## Fórmulas matemáticas

O NeroNote aceita fórmulas em sintaxe LaTeX.

- Clique em **Σ Fórmula** na barra de edição para abrir o editor de fórmulas.
- O botão oferece modelos prontos para fração, potência, raiz, somatório, Bhaskara e lógica.
- `Ctrl+M` abre o editor de fórmulas.
- `Ctrl+Enter` insere a fórmula enquanto o editor de fórmulas estiver aberto.
- Fórmulas inseridas pelo botão são salvas no Markdown como bloco `$$ ... $$`.
- Também é possível usar fórmulas inline com `\( ... \)`.

Exemplo:

```text
A fórmula de Bhaskara é:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

E uma expressão inline: \(a^2 + b^2 = c^2\)
```

A renderização é feita pelo KaTeX carregado via CDN.
# NeroNote
