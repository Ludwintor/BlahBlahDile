using BlahBlahDile.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR()
    .AddNewtonsoftJsonProtocol();

// TODO: Understand how this works and properly change it
// cuz it is pure copy-paste w/o understanding wth is this
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins("http://26.115.121.253:8080")
            .AllowAnyHeader()
            .WithMethods("GET", "POST")
            .AllowCredentials();
    });
});

var app = builder.Build();

//app.UseHttpsRedirection();

app.UseCors();

app.MapHub<DrawHub>("/draw");

app.Run();
