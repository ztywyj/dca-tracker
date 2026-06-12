import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render failed', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="flex min-h-dvh items-center justify-center bg-radial px-4 text-white">
        <section className="card w-full max-w-lg p-6 text-center">
          <p className="label">页面遇到错误</p>
          <h1 className="mt-3 text-xl font-semibold text-white">界面没有正常加载</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            这通常是一次临时的浏览器运行错误。请刷新后继续使用；如果刚刚在获取价格，请手动输入价格也可以完成记录。
          </p>
          <button type="button" onClick={this.handleReload} className="control-button-primary mt-5 w-full">
            刷新页面
          </button>
        </section>
      </div>
    )
  }
}
