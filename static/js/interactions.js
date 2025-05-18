/**
 * CÁRIS - Interações JavaScript
 * Microinterações e efeitos para experiência cinematográfica
 */

// Efeito de máquina de escrever para elementos com classe 'typewriter-effect'
function initTypewriterEffect() {
  const elements = document.querySelectorAll('.typewriter-effect');
  
  elements.forEach(element => {
    const text = element.textContent;
    element.textContent = '';
    
    let i = 0;
    const speed = element.dataset.speed || 50; // Velocidade em ms
    
    function typeWriter() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
      }
    }
    
    // Iniciar efeito com um pequeno atraso
    setTimeout(typeWriter, 500);
  });
}

// Efeito de fade-in para elementos ao entrar na viewport
function initFadeInEffect() {
  const elements = document.querySelectorAll('.fade-in-effect');
  
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  elements.forEach(element => {
    observer.observe(element);
  });
}

// Efeito de hover suave para cards
function initCardHoverEffect() {
  const cards = document.querySelectorAll('.hover-effect');
  
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });
  });
}

// Efeito de foco para campos de formulário
function initFormFocusEffect() {
  const formControls = document.querySelectorAll('.form-control, .form-select');
  
  formControls.forEach(control => {
    control.addEventListener('focus', () => {
      control.parentElement.classList.add('focused');
    });
    
    control.addEventListener('blur', () => {
      control.parentElement.classList.remove('focused');
    });
  });
}

// Efeito de contagem para estatísticas
function initCounterEffect() {
  const counters = document.querySelectorAll('.counter-effect');
  
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const countTo = parseInt(target.dataset.count);
        let count = 0;
        const speed = 2000 / countTo; // Ajusta velocidade baseado no valor final
        
        const updateCount = () => {
          if (count < countTo) {
            count++;
            target.textContent = count;
            setTimeout(updateCount, speed);
          } else {
            target.textContent = countTo;
          }
        };
        
        updateCount();
        observer.unobserve(target);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => {
    observer.observe(counter);
  });
}

// Efeito de transição suave para mudanças de página
function initPageTransitions() {
  const contentArea = document.querySelector('.content');
  
  if (contentArea) {
    contentArea.classList.add('fade-in');
  }
}

// Efeito de digitação para área de texto do diário
function initDiaryTextareaEffect() {
  const textarea = document.querySelector('.diary-textarea');
  
  if (textarea) {
    textarea.addEventListener('input', () => {
      // Adiciona um pequeno atraso para simular digitação pensativa
      setTimeout(() => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }, 50);
    });
  }
}

// Inicializar todos os efeitos quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initTypewriterEffect();
  initFadeInEffect();
  initCardHoverEffect();
  initFormFocusEffect();
  initCounterEffect();
  initPageTransitions();
  initDiaryTextareaEffect();
  
  // Inicializar tooltips do Bootstrap
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});
