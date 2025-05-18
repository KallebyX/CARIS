/**
 * CÁRIS - Configuração de gráficos Chart.js
 * Visualizações poéticas para dashboard
 */

// Configurações globais do Chart.js
Chart.defaults.color = '#F5F5F5';
Chart.defaults.font.family = "'Open Sans', sans-serif";

// Cores para os ciclos
const cycleColors = {
  'Criar': '#D4AF37',  // Dourado
  'Cuidar': '#00A86B', // Verde Jade
  'Crescer': '#9370DB', // Púrpura médio
  'Curar': '#4682B4'   // Azul aço
};

// Cores para emoções
const emotionColors = [
  '#D4AF37', '#00A86B', '#9370DB', '#4682B4', 
  '#FF6347', '#20B2AA', '#BA55D3', '#FF7F50',
  '#3CB371', '#6495ED', '#FF69B4', '#CD853F',
  '#48D1CC', '#C71585', '#F08080', '#6B8E23',
  '#BC8F8F', '#483D8B', '#2E8B57', '#DAA520'
];

// Inicializar gráfico de ciclos
function initCycleChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext('2d');
  
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.datasets[0].data,
        backgroundColor: data.datasets[0].backgroundColor || Object.values(cycleColors),
        borderColor: 'rgba(18, 18, 18, 0.8)',
        borderWidth: 2,
        hoverOffset: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          titleFont: {
            family: "'Merriweather', serif",
            size: 16
          },
          bodyFont: {
            family: "'Open Sans', sans-serif",
            size: 14
          },
          padding: 15,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              return `${label}: ${value} entradas`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 2000,
        easing: 'easeOutQuart'
      }
    }
  });
}

// Inicializar gráfico de emoções
function initEmotionChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext('2d');
  
  return new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.datasets[0].data,
        backgroundColor: data.datasets[0].backgroundColor || emotionColors,
        borderColor: 'rgba(18, 18, 18, 0.8)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          ticks: {
            display: false
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          pointLabels: {
            font: {
              size: 12
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          titleFont: {
            family: "'Merriweather', serif",
            size: 16
          },
          bodyFont: {
            family: "'Open Sans', sans-serif",
            size: 14
          },
          padding: 15,
          cornerRadius: 8,
          displayColors: true
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeOutQuart'
      }
    }
  });
}

// Inicializar gráfico de linha temporal
function initTimelineChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext('2d');
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: data.datasets.map((dataset, index) => {
        return {
          label: dataset.label,
          data: dataset.data,
          borderColor: dataset.borderColor || Object.values(cycleColors)[index % 4],
          backgroundColor: 'transparent',
          tension: 0.4,
          pointBackgroundColor: dataset.borderColor || Object.values(cycleColors)[index % 4],
          pointBorderColor: '#121212',
          pointRadius: 5,
          pointHoverRadius: 8
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 20,
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          titleFont: {
            family: "'Merriweather', serif",
            size: 16
          },
          bodyFont: {
            family: "'Open Sans', sans-serif",
            size: 14
          },
          padding: 15,
          cornerRadius: 8,
          displayColors: true
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeOutQuart'
      }
    }
  });
}

// Carregar dados do dashboard via API
function loadDashboardData() {
  fetch('/dashboard/api/chart-data')
    .then(response => response.json())
    .then(data => {
      // Inicializar gráficos se os elementos existirem
      if (document.getElementById('cycleChart')) {
        initCycleChart('cycleChart', data.cycle_chart);
      }
      
      if (document.getElementById('emotionChart')) {
        initEmotionChart('emotionChart', data.emotion_chart);
      }
      
      // Adicionar mais gráficos conforme necessário
    })
    .catch(error => {
      console.error('Erro ao carregar dados do dashboard:', error);
    });
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se estamos na página do dashboard
  if (document.querySelector('.dashboard-container')) {
    loadDashboardData();
  }
});
