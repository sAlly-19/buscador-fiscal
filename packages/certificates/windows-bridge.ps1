# Bridge PowerShell/.NET para comunicação com Certificados Windows e SEFAZ mTLS
param(
    [Parameter(Mandatory=$true)]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$Thumbprint,

    [Parameter(Mandatory=$false)]
    [string]$Url,

    [Parameter(Mandatory=$false)]
    [string]$SoapAction,

    [Parameter(Mandatory=$false)]
    [string]$EnvelopeFile,

    [Parameter(Mandatory=$false)]
    [int]$TimeoutSec = 30
)

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::Expect100Continue = $false
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ($Action -eq "list") {
    $certs = @(Get-ChildItem -Path "Cert:\CurrentUser\My" -ErrorAction SilentlyContinue)
    try {
        $certs += @(Get-ChildItem -Path "Cert:\LocalMachine\My" -ErrorAction Stop)
    } catch {
        # A store da máquina pode exigir privilégios; a store do usuário continua disponível.
    }
    $certs = $certs | Where-Object { $_.HasPrivateKey } | Sort-Object Thumbprint -Unique
    $list = @()

    foreach ($cert in $certs) {
        $subject = $cert.Subject
        $cnpj = ""
        $cpf = ""

        # Extrai CNPJ ou CPF padrão ICP-Brasil (ex: CN=RAZAO SOCIAL:12345678000195 ou CN=NOME:12345678901)
        if ($subject -match ":(\d{14})") {
            $cnpj = $matches[1]
        } elseif ($subject -match ":(\d{11})") {
            $cpf = $matches[1]
        }

        $isExpired = $cert.NotAfter -lt (Get-Date)

        $list += [PSCustomObject]@{
            Thumbprint = $cert.Thumbprint
            Subject = $cert.Subject
            Issuer = $cert.Issuer
            SerialNumber = $cert.SerialNumber
            ValidFrom = $cert.NotBefore.ToString("o")
            ValidTo = $cert.NotAfter.ToString("o")
            HasPrivateKey = $cert.HasPrivateKey
            IsExpired = $isExpired
            CNPJ = $cnpj
            CPF = $cpf
        }
    }

    $json = $list | ConvertTo-Json -Depth 3 -Compress
    Write-Output $json
    exit 0
}

if ($Action -eq "request") {
    if (-not $Thumbprint -or -not $Url -or -not $EnvelopeFile) {
        Write-Error "Parâmetros obrigatórios ausentes para ação 'request'."
        exit 1
    }

    if ($Thumbprint -notmatch '^[a-fA-F0-9]{40,64}$') {
        Write-Error "Thumbprint de certificado inválido."
        exit 4
    }

    if ($Url -notmatch '^https://') {
        Write-Error "A URL da SEFAZ deve usar HTTPS."
        exit 5
    }

    $cert = Get-Item -Path "Cert:\CurrentUser\My\$Thumbprint" -ErrorAction SilentlyContinue
    if (-not $cert) {
        # Tenta também na store LocalMachine se não estiver em CurrentUser
        $cert = Get-Item -Path "Cert:\LocalMachine\My\$Thumbprint" -ErrorAction SilentlyContinue
    }

    if (-not $cert) {
        Write-Error "Certificado com Thumbprint '$Thumbprint' não foi localizado no repositório do Windows."
        exit 2
    }

    if (-not (Test-Path $EnvelopeFile)) {
        Write-Error "Arquivo de envelope SOAP '$EnvelopeFile' não encontrado."
        exit 3
    }

    $envelopeContent = [System.IO.File]::ReadAllText($EnvelopeFile, [System.Text.Encoding]::UTF8)
    $envelopeBytes = [System.Text.Encoding]::UTF8.GetBytes($envelopeContent)

    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = "POST"
    $request.ContentType = "application/soap+xml; charset=utf-8; action=`"$SoapAction`""
    $request.ContentLength = $envelopeBytes.Length
    $request.Timeout = $TimeoutSec * 1000
    $request.ReadWriteTimeout = $TimeoutSec * 1000
    $request.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
    [void]$request.ClientCertificates.Add($cert)
    $request.KeepAlive = $false

    try {
        $reqStream = $request.GetRequestStream()
        $reqStream.Write($envelopeBytes, 0, $envelopeBytes.Length)
        $reqStream.Close()

        $response = $request.GetResponse()
        $respStream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()

        $resObj = [PSCustomObject]@{
            StatusCode = [int]$response.StatusCode
            ResponseBody = $responseBody
        }

        Write-Output ($resObj | ConvertTo-Json -Depth 2 -Compress)
        exit 0
    } catch [System.Net.WebException] {
        $webEx = $_.Exception
        $statusCode = 500
        $errorBody = ""
        $errorMessage = $webEx.Message

        if ($webEx.Status -eq [System.Net.WebExceptionStatus]::Timeout) {
            $errorMessage = "Tempo limite atingido (${TimeoutSec}s). A SEFAZ pode estar com instabilidade ou lentidão temporária."
        }

        if ($webEx.Response) {
            $statusCode = [int]$webEx.Response.StatusCode
            $respStream = $webEx.Response.GetResponseStream()
            if ($respStream) {
                $reader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                $errorBody = $reader.ReadToEnd()
                $reader.Close()
            }
        } else {
            $errorBody = $errorMessage
        }

        $resObj = [PSCustomObject]@{
            StatusCode = $statusCode
            Error = $errorMessage
            ResponseBody = $errorBody
        }

        Write-Output ($resObj | ConvertTo-Json -Depth 2 -Compress)
        exit 0
    } catch {
        $resObj = [PSCustomObject]@{
            StatusCode = 500
            Error = $_.Exception.Message
            ResponseBody = ""
        }
        Write-Output ($resObj | ConvertTo-Json -Depth 2 -Compress)
        exit 0
    }
}

Write-Error "Ação '$Action' desconhecida."
exit 1
