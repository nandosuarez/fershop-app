import os

from fershop_calculadora.runtime_time import configure_process_timezone


if __name__ == "__main__":
    configure_process_timezone()
    from fershop_calculadora.server import run_server

    render_environment = bool(os.environ.get("RENDER"))
    host = os.environ.get("FERSHOP_HOST") or ("0.0.0.0" if render_environment else "127.0.0.1")
    raw_port = os.environ.get("PORT") or os.environ.get("FERSHOP_PORT") or "8000"
    run_server(host=host, port=int(raw_port))
