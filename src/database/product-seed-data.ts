// Local sources used only to import example image bytes. Never persisted as product columns.

export const burguerProducts = [
  {
    id: 'classic-burger',
    title: 'Classic Burger',
    description:
      'Hambúrguer bovino artesanal, queijo derretido, alface, tomate, cebola roxa, picles e molho da casa no pão de brioche tostado.',
    desktopSource: '/assets/imagem1TRealSize.jpg',
    mobileSource: '/assets/imagem1.png',
    image_alt: 'Classic Burger com carne bovina, queijo, alface, tomate e molho da casa',
    price: 25.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'duplo-bacon',
    title: 'Duplo Bacon',
    description:
      'Dois hambúrgueres bovinos artesanais, queijo cheddar, bacon crocante, cebola roxa e molho especial no pão com gergelim.',
    desktopSource: '/assets/imagem2RealSize.jpg',
    mobileSource: '/assets/imagem(2).png',
    image_alt: 'Duplo Bacon com duas carnes, cheddar, bacon e cebola roxa',
    price: 36.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'cheeseburger-salada',
    title: 'Cheeseburger Salada',
    description:
      'Hambúrguer bovino artesanal, queijo cheddar derretido, alface, tomate, cebola e maionese da casa no pão com gergelim.',
    desktopSource: '/assets/imagem3RealSize.jpg',
    mobileSource: '/assets/imagem(3).png',
    image_alt: 'Cheeseburger Salada com carne bovina, cheddar, alface, tomate e cebola',
    price: 28.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'veggie-burger',
    title: 'Veggie Burger',
    description:
      'Hambúrguer vegetal artesanal, queijo cheddar derretido, alface, tomate, cebola roxa, picles e molho especial da casa, no pão de brioche tostado.',
    desktopSource: '/assets/imagem4RealSize.jpg',
    mobileSource: '/assets/imagem(4).png',
    image_alt:
      'Veggie Burger com hambúrguer vegetal, queijo cheddar, alface, tomate, cebola roxa e picles',
    price: 27.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'chicken-burger',
    title: 'Chicken Burger',
    description:
      'Filé de frango empanado crocante, queijo cheddar derretido, alface, tomate, picles e maionese da casa, no pão de brioche tostado.',
    desktopSource: '/assets/Imagem5RealSize.jpg',
    mobileSource: '/assets/imagem(5).png',
    image_alt:
      'Chicken Burger com frango empanado crocante, queijo cheddar, alface, tomate e picles',
    price: 29.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'fish-burger-duplo',
    title: 'Fish Burger Duplo',
    description:
      'Dois filés de peixe empanado crocante, queijo cheddar derretido, alface, tomate, picles e molho tártaro, no pão de brioche tostado.',
    desktopSource: '/assets/imagem6RealSize.jpg',
    mobileSource: '/assets/imagem(6).png',
    image_alt:
      'Fish Burger Duplo com dois filés de peixe empanado, queijo cheddar, alface, tomate e picles',
    price: 34.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'bacon-bbq',
    title: 'Bacon BBQ',
    description:
      'Hambúrguer bovino, queijo cheddar derretido, bacon crocante, cebola caramelizada e molho barbecue, no pão de brioche tostado.',
    desktopSource: '/assets/Imagem7RealSize.jpg',
    mobileSource: '/assets/imagem(7).png',
    image_alt:
      'Bacon BBQ com hambúrguer bovino, queijo cheddar, bacon crocante, cebola caramelizada e molho barbecue',
    price: 32.9,
    category: { id: 1, name: 'Hamburguer' },
  },
  {
    id: 'super-cheddar-bacon',
    title: 'Super Cheddar Bacon',
    description:
      'Dois suculentos hambúrgueres bovinos, muito queijo cheddar cremoso, bastante bacon crocante e molho especial da casa, no pão de brioche tostado.',
    desktopSource: '/assets/Imagem8RealSize.jpg',
    mobileSource: '/assets/imagem(8).png',
    image_alt:
      'Super Cheddar Bacon com duas carnes, muito queijo cheddar cremoso e bacon crocante',
    price: 39.9,
    category: { id: 1, name: 'Hamburguer' },
  },
] as const;

export const drinkProducts = [
  {
    id: 'milkshake-morango',
    title: 'Milkshake de Morango',
    description: 'Milkshake cremoso de morango, preparado com leite e sorvete, servido bem gelado.',
    desktopSource: '/assets_drinks/imagem1RealSize.jpg',
    mobileSource: '/assets_drinks/imagem1.png',
    image_alt: 'Copo de milkshake rosa com canudo e morangos ao lado',
    price: 16.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'suco-laranja',
    title: 'Suco de Laranja',
    description: 'Suco de laranja refrescante, servido gelado para acompanhar seu lanche.',
    desktopSource: '/assets_drinks/imagem2RealSize.jpg',
    mobileSource: '/assets_drinks/imagem(2).png',
    image_alt: 'Copo de suco de laranja com laranjas cortadas ao lado',
    price: 9.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'coca-cola-lata',
    title: 'Coca-Cola Lata',
    description: 'Coca-Cola original em lata, servida bem gelada.',
    desktopSource: '/assets_drinks/imagem3RealSiza.jpg',
    mobileSource: '/assets_drinks/imagem(3).png',
    image_alt: 'Lata vermelha de Coca-Cola sobre uma mesa',
    price: 6.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'milkshake-chocolate',
    title: 'Milkshake de Chocolate',
    description: 'Milkshake cremoso de chocolate, preparado com leite e sorvete de chocolate, servido gelado.',
    desktopSource: '/assets_drinks/imagem4RealSize.jpg',
    mobileSource: '/assets_drinks/imagem(4).png',
    image_alt: 'Copo de milkshake de chocolate com raspas de chocolate por cima',
    price: 16.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'limonada-suica',
    title: 'Limonada Suíça',
    description: 'Limonada suíça cremosa, preparada com limão e leite condensado, servida bem gelada.',
    desktopSource: '/assets_drinks/imagem5RealSize.jpg',
    mobileSource: '/assets_drinks/imagem(5).png',
    image_alt: 'Copo de limonada cremosa com limões inteiros e cortados ao lado',
    price: 11.9,
    category: { id: 3, name: 'Bebidas' },
  },
  {
    id: 'suco-maracuja',
    title: 'Suco de Maracujá',
    description: 'Suco de maracujá com sabor levemente ácido e refrescante, servido gelado.',
    desktopSource: '/assets_drinks/imagem6RealSize.jpg',
    mobileSource: '/assets_drinks/imagem(6).png',
    image_alt: 'Copo de suco amarelo com maracujá inteiro e cortado ao lado',
    price: 10.9,
    category: { id: 3, name: 'Bebidas' },
  },
] as const;

export const sidesProducts = [
  {
    id: 'batata-frita',
    title: 'Batata Frita',
    description: 'Porção de batatas fritas douradas, crocantes por fora e macias por dentro, finalizadas com sal e ervas.',
    desktopSource: '/assets_sides/imagem1RealSize.jpg',
    mobileSource: '/assets_sides/imagem1.png',
    image_alt: 'Porção de batatas fritas douradas com ervas sobre uma superfície escura',
    price: 18.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'polenta-frita',
    title: 'Polenta Frita',
    description: 'Palitos de polenta frita, dourados por fora e macios por dentro, ideais para compartilhar.',
    desktopSource: '/assets_sides/imagem2RealSize.jpg',
    mobileSource: '/assets_sides/imagem(2).png',
    image_alt: 'Palitos dourados de polenta frita em uma travessa de vidro',
    price: 19.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'calabresa-fatiada',
    title: 'Calabresa Fatiada',
    description: 'Porção de linguiça calabresa em rodelas, com sabor marcante e levemente defumado.',
    desktopSource: '/assets_sides/imagem3RealSiza.jpg',
    mobileSource: '/assets_sides/imagem(3).png',
    image_alt: 'Linguiça calabresa cortada em rodelas sobre uma tábua de madeira',
    price: 24.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'queijo-coalho-grelhado',
    title: 'Queijo Coalho Grelhado',
    description: 'Palitos de queijo coalho grelhados até dourar, acompanhados de molho da casa.',
    desktopSource: '/assets_sides/imagem4RealSize.jpg',
    mobileSource: '/assets_sides/imagem(4).png',
    image_alt: 'Palitos de queijo grelhado dourado em uma tigela com molho ao lado',
    price: 26.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'nuggets-frango',
    title: 'Nuggets de Frango',
    description: 'Porção de nuggets de frango empanados e crocantes, acompanhados de molho de mostarda.',
    desktopSource: '/assets_sides/imagem5RealSize.jpg',
    mobileSource: '/assets_sides/imagem(5).png',
    image_alt: 'Nuggets de frango dourados em uma tigela com molho de mostarda ao lado',
    price: 22.9,
    category: { id: 2, name: 'Porcoes' },
  },
  {
    id: 'aneis-cebola',
    title: 'Anéis de Cebola',
    description: 'Anéis de cebola empanados, dourados e crocantes, acompanhados de molho da casa.',
    desktopSource: '/assets_sides/imagem(6).png',
    mobileSource: '/assets_sides/imagem(6).png',
    image_alt: 'Anéis de cebola empanados em uma tigela com molho ao lado',
    price: 21.9,
    category: { id: 2, name: 'Porcoes' },
  },
] as const;

export const productSeeds = [...burguerProducts, ...drinkProducts, ...sidesProducts];
