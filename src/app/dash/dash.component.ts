import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgClass, DatePipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dash',
  templateUrl: './dash.component.html',
  styleUrls: ['./dash.component.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, NgClass, DatePipe]
})
export class DashComponent implements AfterViewInit {
  showInputForm = true;
  currentDate = new Date();

  formData = {
    exposureLevel: 'Medium',
    exposureCurrent: 65,
    exposurePrevious: 70,
    exposureHighRisk: 12,
    totalAssets: 150,
    configScore: 825,
    configCompliance: 82,
    openAlerts: 23,
    sevCritical: 5,
    sevHigh: 12,
    sevMedium: 25,
    sevLow: 40,
    sevInformative: 15,
    trendData: '200,180,160,140,120,100,90,80,70,60,50,40',
    remediationAreas: 'Host,Network,Application',
    remediationCompleted: '120,80,60',
    remediationPending: '30,40,20'
  };

  private severityChart?: Chart;
  private trendChart?: Chart;
  private remediationChart?: Chart;

  constructor(private router: Router) {
    Chart.register(...registerables);
  }

  ngAfterViewInit() {
    if (!this.showInputForm) {
      this.createCharts();
    }
  }

  onSubmit() {
    this.showInputForm = false;
    this.currentDate = new Date();
    setTimeout(() => this.createCharts(), 100);
  }

  ngOnInit() {
  const navigation = this.router.getCurrentNavigation();
  if (navigation?.extras.state) {
    this.formData = navigation.extras.state['reportData'];
  }
}

  navigateToReport() {
    const reportData = {
      dashboardData: this.formData,
      timestamp: new Date().toISOString()
    };
    this.router.navigate(['/report'], { state: { reportData } });
  }

  private createCharts() {
    this.createSeverityChart();
    this.createTrendChart();
    this.createRemediationChart();
  }

  private createSeverityChart() {
    const ctx = document.getElementById('severityChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.severityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low', 'Informative'],
        datasets: [{
          data: [
            this.formData.sevCritical,
            this.formData.sevHigh,
            this.formData.sevMedium,
            this.formData.sevLow,
            this.formData.sevInformative
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Vulnerability Severity Distribution')
    });
  }

  private createTrendChart() {
    const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!ctx) return;

    const trendData = this.formData.trendData.split(',').map(Number);
    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trendData.map((_, i) => `Month ${i + 1}`),
        datasets: [{
          label: 'Vulnerabilities',
          data: trendData,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: this.getChartOptions('Monthly Vulnerability Trend')
    });
  }

  private createRemediationChart() {
    const ctx = document.getElementById('remediationChart') as HTMLCanvasElement;
    if (!ctx) return;

    const areas = this.formData.remediationAreas.split(',');
    const completed = this.formData.remediationCompleted.split(',').map(Number);
    const pending = this.formData.remediationPending.split(',').map(Number);

    this.remediationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: areas,
        datasets: [
          {
            label: 'Completed',
            data: completed,
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Pending',
            data: pending,
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: this.getChartOptions('Remediation Progress', true)
    });
  }

  private getChartOptions(title: string, stacked = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          color: '#e0e0e0',
          font: {
            size: 16,
            family: "'Inter', sans-serif",
            weight: 500 as const
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        legend: {
          labels: {
            color: '#e0e0e0',
            font: {
              family: "'Inter', sans-serif"
            }
          }
        }
      },
      scales: {
        x: {
          stacked: stacked,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#a0a0a0'
          }
        },
        y: {
          stacked: stacked,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#a0a0a0'
          }
        }
      }
    };
  }
}