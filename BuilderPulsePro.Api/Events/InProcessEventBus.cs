using Microsoft.Extensions.DependencyInjection;

namespace BuilderPulsePro.Api.Events;

public sealed class InProcessEventBus(IServiceScopeFactory scopeFactory) : IEventBus
{
    public async Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct = default)
        where TEvent : IDomainEvent
    {
        // Resolve handlers within a scope so scoped dependencies are available.
        using var scope = scopeFactory.CreateScope();
        var handlers = scope.ServiceProvider.GetServices<IEventHandler<TEvent>>();
        foreach (var h in handlers)
            await h.HandleAsync(evt, ct);
    }
}
