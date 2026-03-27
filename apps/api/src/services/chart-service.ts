export const getQuickChartUrl = (type: 'pie' | 'bar', labels: string[], data: number[], title: string) => {
  const chartConfig = {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: title,
        data: data,
        backgroundColor: [
          '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
        ]
      }]
    },
    options: {
      title: { display: true, text: title, fontColor: '#fff' },
      legend: { labels: { fontColor: '#fff' } }
    }
  }
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&bg=%231e1e1e`
}
