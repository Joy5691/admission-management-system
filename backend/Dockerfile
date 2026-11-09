# ---- Build stage ----
# Using .NET 10 SDK (matches local development environment)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/SchoolAdmission/SchoolAdmission.csproj ./src/SchoolAdmission/
RUN dotnet restore ./src/SchoolAdmission/SchoolAdmission.csproj

COPY src/SchoolAdmission/ ./src/SchoolAdmission/
RUN dotnet publish ./src/SchoolAdmission/SchoolAdmission.csproj -c Release -o /app/publish 

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "SchoolAdmission.dll"]
