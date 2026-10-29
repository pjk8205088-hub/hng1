// Translate only the administrator interface. Stored customer, order, and product
// values are left unchanged; the storefront keeps its own PT-BR copy.
(() => {
  const copy = new Map(Object.entries({
    'Área restrita': '관리자 전용',
    'Entrar no painel H&G': 'H&G 관리자 로그인',
    'Use sua conta de administrador para consultar pedidos, membros e produtos.': '관리자 계정으로 주문, 회원 및 상품을 확인하세요.',
    'E-mail': '이메일',
    'Senha': '비밀번호',
    'Entrar': '로그인',
    'Abrir menu': '메뉴 열기',
    'AdminLTE 4 • PT-BR': '관리자 화면 · 한국어',
    'Pesquisar pedidos, códigos ou produtos': '주문, 추천인 코드 또는 상품 검색',
    'Exportar CSV': 'CSV 다운로드',
    'Ver site': '홈페이지 보기',
    'Sair': '로그아웃',
    'H&G Admin': 'H&G 관리자',
    'Painel': '대시보드',
    'Pedidos': '주문 관리',
    'Membros': '회원 관리',
    'Códigos parceiros': '추천인 코드',
    'Produtos': '상품 관리',
    'Checkout': '결제 설정',
    'Atividade': '활동 내역',
    'Gestão comercial H&G • turismo + estudantes estrangeiros': 'H&G 운영 관리 · 관광 및 유학생',
    'Pedidos, reembolsos, parceiros e produtos num só painel': '주문, 환불, 추천인 및 상품을 한곳에서 관리',
    'Baseado no AdminLTE 4 para uma leitura rápida, limpa e fácil de operar no dia a dia.': '주요 운영 정보를 빠르고 편리하게 확인할 수 있습니다.',
    'Atualizar': '새로고침',
    'Resetar demo': '데모 데이터 초기화',
    'Novo código': '새 코드',
    'Total de pedidos': '총 주문 수',
    'Faturamento bruto': '총 매출',
    'PIX / cartão': 'PIX / 카드',
    'Reembolsos': '환불 건수',
    'Pedidos & pagamentos': '주문 및 결제',
    'Lista de clientes, método de pagamento, código do parceiro e status de reembolso.': '고객, 결제수단, 추천인 코드 및 환불 상태를 확인하세요.',
    'Todos os status': '전체 상태',
    'Pago': '결제 완료',
    'Pendente': '결제 대기',
    'Reembolsado': '환불 완료',
    'Todos os meios': '전체 결제수단',
    'Cartão': '신용카드',
    'Pedido': '주문번호',
    'Cliente': '고객',
    'Plano': '플랜',
    'Pagamento': '결제수단',
    'Código': '코드',
    'Data': '날짜',
    'Valor': '금액',
    'Status': '상태',
    'Ações': '관리',
    'Códigos de parceiro': '추천인 코드',
    'Veja uso, receita e clientes ligados a cada código.': '코드별 사용 건수, 매출 및 고객을 확인하세요.',
    'Parceiro': '파트너',
    'Usos': '사용 건수',
    'Receita': '매출',
    'Membros e clientes': '회원 및 고객',
    'Acompanhe os contatos que iniciaram uma compra ou foram cadastrados pela equipe.': '구매를 시작했거나 담당자가 등록한 고객을 확인하세요.',
    'Buscar nome, e-mail ou WhatsApp': '이름, 이메일 또는 WhatsApp 검색',
    'Buscar membros': '회원 검색',
    'Filtrar status': '상태 필터',
    'Ativo': '활성',
    'Inativo': '비활성',
    'Novo membro': '새 회원',
    'Nome': '이름',
    'Cadastro': '등록일',
    'Produtos: turismo & estudantes estrangeiros': '상품: 관광 및 유학생',
    'Ajuste preço em R$, texto do que inclui e imagem principal do pacote.': '상품 가격(R$), 포함 내역 및 대표 이미지를 수정하세요.',
    'Edição simples': '간편 수정',
    'Pacote Turismo': '관광 상품',
    'Pacote Estudante': '유학생 상품',
    'Prévia do pacote turismo': '관광 상품 미리보기',
    'Prévia do pacote estudante': '유학생 상품 미리보기',
    'Prévia do produto': '상품 미리보기',
    'Nome do produto': '상품명',
    'Preço (R$)': '가격 (R$)',
    'Imagem principal (URL ou caminho)': '대표 이미지 (URL 또는 경로)',
    'Resumo do pacote': '상품 설명',
    'Itens inclusos (um por linha)': '포함 내역 (한 줄에 하나씩)',
    'Disponível': '판매 가능',
    'Poucas vagas': '잔여 수량 적음',
    'Esgotado': '품절',
    'CTA principal': '주요 버튼 문구',
    'Ex.: Finalizar inscrição': '예: 신청 완료',
    'Ex.: Iniciar matrícula': '예: 등록 시작',
    'Salvar pacote': '상품 저장',
    'Configuração de checkout': '결제 설정',
    'Links e contatos usados pelo checkout direto do site.': '홈페이지 결제에 사용하는 링크와 연락처입니다.',
    'Link PIX': 'PIX 결제 링크',
    'Link cartão': '카드 결제 링크',
    'WhatsApp de suporte': '상담용 WhatsApp',
    'Salvar configuração': '설정 저장',
    'Atividade recente': '최근 활동',
    'Ações feitas nesta sessão para acompanhar mudanças na base de demo.': '이 화면에서 변경한 내역을 확인하세요.',
    'H&G Admin • Pedidos e cadastros protegidos por login': 'H&G 관리자 · 주문 및 회원 정보는 로그인으로 보호됩니다',
    'AdminLTE 4.8.5 via CDN': 'AdminLTE 4.8.5 사용',
    'Detalhes do pedido': '주문 상세',
    'Dados completos para cobrança, suporte e reembolso.': '결제, 상담 및 환불에 필요한 상세 정보입니다.',
    'Fechar': '닫기',
    'Reembolsar': '환불 처리',
    'Novo código de parceiro': '새 추천인 코드',
    'Crie ou edite códigos que aparecem no checkout e nas vendas.': '결제와 매출 집계에 사용할 추천인 코드를 만들거나 수정하세요.',
    'Observações': '메모',
    'Cancelar': '취소',
    'Salvar código': '코드 저장',
    'Detalhe do código': '추천인 코드 상세',
    'Clientes, plano e total arrecadado com este parceiro.': '해당 추천인의 고객, 플랜 및 총 매출입니다.',
    'Pagamento': '결제수단',
    'Mantenha os dados usados pelo suporte e pela jornada de compra.': '고객 상담과 구매에 필요한 정보를 관리하세요.',
    'Pacote Turismo Coreia': '한국 관광 상품',
    'Pacote Estudante Internacional': '유학생 상품',
    'Código de indicação': '추천인 코드',
    'Salvar membro': '회원 저장',
    'Nenhum pedido encontrado.': '주문 내역이 없습니다.',
    'Nenhum código cadastrado.': '등록된 추천인 코드가 없습니다.',
    'Nenhum membro encontrado.': '회원이 없습니다.',
    'Nenhum cliente vinculado a este código.': '이 코드와 연결된 고객이 없습니다.',
    'Sem atividade recente.': '최근 활동이 없습니다.',
    'Detalhes': '상세 보기',
    'Clientes': '고객 목록',
    'Editar': '수정',
    'Excluir': '삭제',
    'Meio': '결제수단',
    'Uso total': '총 사용 건수',
    'Receita líquida': '순매출',
    'Demo inicial carregada': '데모 데이터가 로드되었습니다',
    'Pedidos, parceiros e produtos foram semeados para a área administrativa.': '관리자 화면에 예시 주문, 추천인 및 상품 데이터가 표시됩니다.',
    'Canal ANSA ativo': 'ANSA 추천인 활성',
    'O código ANSA aparece vinculado aos pedidos do painel.': '주문에 ANSA 추천인 코드가 연결되어 있습니다.',
    'Pacote Estudante atualizado': '유학생 상품 업데이트',
    'Imagem principal e preço ficaram prontos para edição rápida.': '대표 이미지와 가격을 간편하게 수정할 수 있습니다.',
    'há poucos segundos': '방금 전',
    'hoje': '오늘',
    'agora': '지금',
    'Admin credentials are not configured on the server.': '서버에 관리자 계정이 설정되지 않았습니다.',
    'Invalid admin credentials.': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'E-mail ou senha incorretos.': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Unable to load admin data.': '관리자 데이터를 불러올 수 없습니다.',
    'Não foi possível entrar.': '로그인할 수 없습니다.',
    'O painel precisa ser configurado no servidor antes do primeiro acesso.': '관리자 화면을 사용하려면 서버 설정이 필요합니다.',
    'Close': '닫기',
  }));

  const patterns = [
    [/^Editar código (.+)$/u, '추천인 코드 $1 수정'],
    [/^Código (.+) • (.+)$/u, '추천인 코드 $1 · $2'],
    [/^Código (.+) salvo com sucesso\.$/u, '추천인 코드 $1 저장 완료'],
    [/^Editar membro (.+)$/u, '$1 회원 수정'],
    [/^Membro (.+) salvo com sucesso\.$/u, '$1 회원 저장 완료'],
    [/^Membro (.+) excluído\.$/u, '$1 회원 삭제 완료'],
    [/^Produto (.+) salvo com sucesso\.$/u, '$1 상품 저장 완료'],
    [/^Pedido (.+) marcado como reembolsado\.$/u, '주문 $1을 환불 완료로 표시했습니다.'],
    [/^Reembolsar (.+) \((.+)\)\?$/u, '$1 ($2) 주문을 환불 처리하시겠습니까?'],
    [/^Excluir o cadastro de (.+)\?$/u, '$1 회원을 삭제하시겠습니까?'],
    [/^Plano: (.+)$/u, '플랜: $1'],
    [/^Código: (.+)$/u, '코드: $1'],
    [/^Pagamento: (.+)$/u, '결제: $1'],
  ];

  const translate = (value) => {
    const text = value.trim();
    if (!text) return value;
    let result = copy.get(text);
    if (!result) {
      for (const [pattern, replacement] of patterns) {
        if (pattern.test(text)) {
          result = text.replace(pattern, replacement);
          break;
        }
      }
    }
    if (!result || result === text) return value;
    return value.replace(text, result);
  };

  function localize(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script, style, textarea')) continue;
      const next = translate(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : root.querySelectorAll('*');
    for (const element of elements) {
      for (const attribute of ['placeholder', 'aria-label', 'alt', 'title']) {
        const value = element.getAttribute(attribute);
        if (value) {
          const next = translate(value);
          if (next !== value) element.setAttribute(attribute, next);
        }
      }
    }
  }

  document.documentElement.lang = 'ko';
  localize(document.body);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        const next = translate(record.target.nodeValue);
        if (next !== record.target.nodeValue) record.target.nodeValue = next;
      } else if (record.type === 'attributes') {
        const value = record.target.getAttribute(record.attributeName);
        if (value) {
          const next = translate(value);
          if (next !== value) record.target.setAttribute(record.attributeName, next);
        }
      } else {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const next = translate(node.nodeValue);
            if (next !== node.nodeValue) node.nodeValue = next;
          } else if (node.nodeType === Node.ELEMENT_NODE) localize(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'alt', 'title'] });
  window.addEventListener('beforeunload', () => observer.disconnect());
})();
