
$(document).ready(function () {
  $('#form').on('submit', (e) => {
    e.preventDefault()
    let json = monaco.editor.getModels()[0].getValue()
    console.log(json)

    $.ajax({
      url: location.href,
      type: 'PUT',
      data: {
        nombre: $('#nombre').val(),
        url: $('#url').val(),
        esquema: json
      }
    })
      .done(response => console.log(response))
      .fail(error => console.log(error));
  })
});